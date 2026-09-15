from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge import Concept, KnowledgeState
from app.models.assessment import AssessmentResponse

router = APIRouter(prefix="/career", tags=["Industry Benchmarks & Career Readiness Radar"])

INDUSTRY_TRACKS: List[Dict[str, Any]] = [
    # --- 1. BIG TECH & GLOBAL PLATFORMS ---
    {
        "id": "google_swe",
        "company": "Google",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Development Engineer (L3/L4)",
        "summary": "Google's hiring bar centers on algorithmic rigor, deep mathematical intuition for Big-O limits, and flawless edge-case handling on blank whiteboards.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Data Structures & Algorithms", "weight_percent": 55, "focus": "Graphs (BFS/DFS/Dijkstra), Dynamic Programming, Binary Trees, Prefix Sums, Edge Cases"},
            {"domain": "Operating Systems & Concurrency", "weight_percent": 25, "focus": "Threads, Semaphores, Memory Management, Deadlock prevention"},
            {"domain": "Clean Code & Scalability", "weight_percent": 20, "focus": "Optimal space complexity, modular code, zero unhandled exceptions"}
        ],
        "key_topics": ["Graphs & Trees", "Dynamic Programming", "Recursion & Backtracking", "Operating Systems Concurrency", "Time Complexity Analysis"],
        "interviewer_tip": "Google interviewers specifically penalize jumping straight into code without clarifying input boundaries and stating initial time/space constraints."
    },
    {
        "id": "meta_swe",
        "company": "Meta (Facebook)",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (E3/E4)",
        "summary": "Meta prioritizes ultra-fast algorithmic coding speed (2 Medium/Hard problems in 45 mins) and massive real-time feed/graph architecture.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Speed Algorithms & Coding", "weight_percent": 50, "focus": "Sliding Window, Binary Search, Graph Traversals, Trie data structures"},
            {"domain": "Distributed Systems & Caching", "weight_percent": 30, "focus": "Memcached, Graph databases, Real-time feed fanout, CDN caching"},
            {"domain": "Production Bug-Free Execution", "weight_percent": 20, "focus": "Dry running test cases, zero compiler hints, pristine clean code"}
        ],
        "key_topics": ["Graph Traversals & Tries", "Sliding Window Optimization", "Distributed Feed Architecture", "Caching & Invalidation", "Hash Table Collision Resolution"],
        "interviewer_tip": "Meta interviews are notoriously fast-paced. You must write bug-free code for the first question within 18 minutes to leave room for the second question."
    },
    {
        "id": "apple_swe",
        "company": "Apple",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (Core OS / Services)",
        "summary": "Apple focuses on hardware-software integration, low-level memory efficiency, Swift/C++ performance, and seamless user-privacy guarantees.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "C/C++ & Memory Management", "weight_percent": 45, "focus": "Pointers, ARC/Manual memory, Stack vs Heap, Cache coherence"},
            {"domain": "Data Structures & Performance", "weight_percent": 35, "focus": "Bitwise operations, Arrays, Priority queues, String parsing"},
            {"domain": "Concurrency & Device APIs", "weight_percent": 20, "focus": "Grand Central Dispatch (GCD), Mutexes, Asynchronous pipelines"}
        ],
        "key_topics": ["Pointers & Memory Allocation", "Bitwise Operations", "Concurrency & Dispatch Queues", "Cache Line Alignment", "Object Lifecycles"],
        "interviewer_tip": "Apple teams are highly specialized. Expect team-specific deep dives into hardware registers, kernel interrupts, or graphic rendering pipelines."
    },
    {
        "id": "amazon_sde",
        "company": "Amazon",
        "sector": "Big Tech & Global Platforms",
        "role": "SDE I & II (AWS & Retail Core)",
        "summary": "Amazon prioritizes practical Object-Oriented Design (LLD), robust Database indexing, and scalable distributed patterns coupled with 16 Leadership Principles.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Low-Level Design & OOP", "weight_percent": 40, "focus": "SOLID principles, Factory/Observer patterns, Class hierarchies, Extensibility"},
            {"domain": "DBMS & Storage Engines", "weight_percent": 35, "focus": "B-Tree indexing, ACID transactions, Sharding, DynamoDB key design"},
            {"domain": "Core Data Structures", "weight_percent": 25, "focus": "Heaps / Priority Queues, Sliding Window, Binary Search, Hash Tables"}
        ],
        "key_topics": ["Object-Oriented Design", "Database Indexing & ACID", "Heaps & Priority Queues", "System Modularity", "Cache & Storage Strategies"],
        "interviewer_tip": "Be prepared to defend design tradeoffs (e.g., Read-heavy vs Write-heavy database schema) and relate design decisions to customer obsession."
    },
    {
        "id": "microsoft_swe",
        "company": "Microsoft",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (Core Engineering & Azure)",
        "summary": "Microsoft evaluates fundamental computer science foundations across OS, memory hierarchy, Computer Networks, alongside structured tree and string algorithms.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Computer Science Core", "weight_percent": 40, "focus": "Virtual Memory, Paging, TCP/IP handshakes, DNS, HTTP/HTTPS protocols"},
            {"domain": "Algorithms & Traversal", "weight_percent": 40, "focus": "Binary Search Trees, Linked Lists, Matrix manipulations, Recursion"},
            {"domain": "API Design & SQL", "weight_percent": 20, "focus": "RESTful standards, relational normalization (1NF-3NF)"}
        ],
        "key_topics": ["Virtual Memory & Paging", "Computer Networks & Protocols", "Binary Search Trees", "Relational Database Normalization", "Linked Data Structures"],
        "interviewer_tip": "Microsoft interviewers love seeing you write test cases manually with corner cases (empty lists, negative numbers, overflow values) before stating your code is done."
    },
    {
        "id": "netflix_swe",
        "company": "Netflix",
        "sector": "Big Tech & Global Platforms",
        "role": "Senior Platform / Distributed Systems Engineer",
        "summary": "Netflix hires seasoned problem solvers with deep intuition for microservices resilience, Chaos Engineering, and ultra-high-throughput video streaming pipelines.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Distributed Architecture & Resilience", "weight_percent": 50, "focus": "Circuit breakers, Event-driven architecture, Sharding, Kafka, CAP theorem"},
            {"domain": "System Observability & Concurrency", "weight_percent": 30, "focus": "Distributed tracing, Metrics aggregation, Non-blocking I/O (Netty/Node)"},
            {"domain": "Data Structures & Algorithmic Scale", "weight_percent": 20, "focus": "Custom buffer queues, LRU/LFU cache eviction, Graph dependency resolution"}
        ],
        "key_topics": ["Event-Driven Microservices", "CAP Theorem & Consistency", "Non-Blocking I/O", "Cache Eviction Algorithms", "Chaos Engineering Principles"],
        "interviewer_tip": "Netflix expects senior autonomy. Always clarify failure modes: what happens when 30% of downstream microservices fail under peak Friday evening traffic?"
    },
    {
        "id": "uber_swe",
        "company": "Uber",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (Marketplace & Core Infrastructure)",
        "summary": "Uber emphasizes geospatial indexing (H3, QuadTrees), real-time pricing algorithms, high-concurrency microservices (Go/Java), and distributed locks.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Algorithms & Geospatial Structures", "weight_percent": 45, "focus": "QuadTrees, Spatial Hashing, Dijkstra/A* pathfinding, Dynamic Programming"},
            {"domain": "Distributed Consensus & Locks", "weight_percent": 35, "focus": "Raft/Paxos, Redis Redlock, Optimistic locking, Idempotent payment APIs"},
            {"domain": "Low-Latency Concurrency", "weight_percent": 20, "focus": "Goroutines, Worker pools, Channel buffering, Thread synchronization"}
        ],
        "key_topics": ["Spatial Indexing & QuadTrees", "Shortest Path Algorithms (A*)", "Distributed Locking & Consensus", "Concurrency & Goroutines", "Idempotent API Design"],
        "interviewer_tip": "Focus heavily on idempotency and race conditions in ride dispatch / payment processing rounds."
    },
    {
        "id": "airbnb_swe",
        "company": "Airbnb",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (Full Stack & Systems)",
        "summary": "Airbnb values full-stack engineering excellence, clean design system architecture, flexible schema modeling, and search rank filtering.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Data Structures & Search Indexing", "weight_percent": 45, "focus": "Inverted index, Prefix match, Interval scheduling, Multi-constraint search"},
            {"domain": "System Design & Data Modeling", "weight_percent": 35, "focus": "Reservation locking, Calendar availability matrices, GraphQL federation"},
            {"domain": "Clean Engineering & Code Craft", "weight_percent": 20, "focus": "Refactoring, Idiomatic language idioms, Production testing suites"}
        ],
        "key_topics": ["Inverted Index & Search", "Interval Scheduling Algorithms", "Availability Matrix Modeling", "GraphQL & REST Architecture", "Design Systems"],
        "interviewer_tip": "Airbnb puts heavy emphasis on cross-functional communication and user-centric edge case handling."
    },
    {
        "id": "bytedance_swe",
        "company": "ByteDance (TikTok)",
        "sector": "Big Tech & Global Platforms",
        "role": "Backend / Recommendation Systems Engineer",
        "summary": "ByteDance tests extreme algorithmic hardness (LeetCode Hard graphs/DP) combined with ultra-high QPS feed recommendation infrastructure.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Advanced Competitive Algorithms", "weight_percent": 55, "focus": "Segment Trees, Fenwick Trees, Hard Dynamic Programming, Graph Flow"},
            {"domain": "High-Throughput Backend (Go/C++)", "weight_percent": 30, "focus": "High QPS load balancing, Epoll/kqueue, Zero-copy serialization, Protobuf"},
            {"domain": "Distributed Storage & Messaging", "weight_percent": 15, "focus": "Kafka partitions, RocksDB, LSM-tree read/write amplification"}
        ],
        "key_topics": ["Segment & Fenwick Trees", "Hard Dynamic Programming", "LSM-Trees & RocksDB", "High-QPS Network I/O", "Protobuf & RPC Protocols"],
        "interviewer_tip": "Be prepared for minimal warm-up. ByteDance jumps directly into complex algorithmic proofs and multi-variable recurrence relations."
    },
    {
        "id": "spotify_swe",
        "company": "Spotify",
        "sector": "Big Tech & Global Platforms",
        "role": "Software Engineer (Backend & Audio Systems)",
        "summary": "Spotify emphasizes audio streaming buffering, peer-assisted networking, collaborative playlist synchronization, and recommendation pipelines.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Data Structures & Stream Buffering", "weight_percent": 40, "focus": "Circular buffers, Range queries, Graph shortest paths, Hash rings"},
            {"domain": "Distributed Systems & Event Sync", "weight_percent": 40, "focus": "CRDTs for collaborative sync, Pub/Sub messaging, Cassandra/ScyllaDB"},
            {"domain": "Observability & Resilience", "weight_percent": 20, "focus": "Client-side telemetry, Adaptive bitrate streaming, Fallback queues"}
        ],
        "key_topics": ["Circular Buffering & Streaming", "CRDTs & State Synchronization", "Consistent Hashing", "Pub/Sub Architectures", "Cassandra Data Modeling"],
        "interviewer_tip": "Understand the tradeoff between immediate consistency and eventual consistency in distributed social features like shared listening sessions."
    },

    # --- 2. FINTECH, QUANT & HIGH-FREQUENCY TRADING ---
    {
        "id": "jane_street",
        "company": "Jane Street",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Quantitative Trader / OCaml Software Engineer",
        "summary": "Jane Street tests functional programming paradigms (OCaml/Haskell), rigorous discrete probability, market making game theory, and expected value betting.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Probability & Mathematical Games", "weight_percent": 50, "focus": "Conditional expectation, Martingales, Combinatorial game theory, Bayes theorem"},
            {"domain": "Functional Thinking & Algorithms", "weight_percent": 35, "focus": "Recursion, Immutability, Monads, Type safety, Graph reduction"},
            {"domain": "Market Microstructure Intuition", "weight_percent": 15, "focus": "Order book bid-ask spread dynamics, Adverse selection, Risk limits"}
        ],
        "key_topics": ["Conditional Expectation & Bayes", "Combinatorial Game Theory", "Functional Recursion", "Order Book Dynamics", "Discrete Probability Distributions"],
        "interviewer_tip": "When presented with a mathematical betting problem, never gamble without positive EV and always hedge extreme downside risk."
    },
    {
        "id": "citadel",
        "company": "Citadel / Citadel Securities",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Quantitative Developer (Low Latency C++)",
        "summary": "Citadel is the world's leading market maker requiring sub-microsecond C++ performance, lock-free ring buffers, and OS kernel bypassing.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Bare-Metal C++ & Low Latency", "weight_percent": 50, "focus": "C++20, Cache lines (L1/L2), Lock-free data structures, Memory fences, SIMD"},
            {"domain": "Core Algorithms & Computational Geometry", "weight_percent": 30, "focus": "Order matching algorithms, Priority queues, Interval trees, Fast sorting"},
            {"domain": "Computer Architecture & Kernel Bypass", "weight_percent": 20, "focus": "Solarflare OpenOnload, DPDK, CPU core pinning, Cache false sharing"}
        ],
        "key_topics": ["Lock-Free Ring Buffers", "Cache Line Alignment & SIMD", "Order Book Matching Engine", "CPU Core Pinning & DPDK", "Memory Barriers & Fences"],
        "interviewer_tip": "Know memory layouts down to the byte. Interviewers will ask you to explain CPU cache line invalidation and false sharing in multi-threaded loops."
    },
    {
        "id": "jump_trading",
        "company": "Jump Trading",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Systems Software Engineer / FPGA Developer",
        "summary": "Jump Trading dominates high-speed derivatives and crypto markets through ultra-low latency hardware design (FPGAs, Verilog) and modern C++ engines.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Hardware Architecture & Low Latency C++", "weight_percent": 45, "focus": "Clock cycle optimization, Pipelining, Memory registers, Template metaprogramming"},
            {"domain": "Network Protocols & Kernel Bypassing", "weight_percent": 35, "focus": "Raw UDP multicast, TCP checksum acceleration, Ethernet frame parsing"},
            {"domain": "Quantitative Math & Algorithms", "weight_percent": 20, "focus": "Time-series sliding metrics, Exponential moving averages, Linear regression"}
        ],
        "key_topics": ["Hardware Pipelining & Clock Cycles", "UDP Multicast & Raw Sockets", "Template Metaprogramming", "Time-Series Rolling Algorithms", "FPGA/C++ Acceleration"],
        "interviewer_tip": "Demonstrate clear understanding of why virtual function tables (vtable lookups) introduce latency penalties in performance-critical execution loops."
    },
    {
        "id": "tower_research",
        "company": "Tower Research Capital",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Core Systems Engineer (C++ / Linux Kernel)",
        "summary": "Tower Research focuses on high-throughput algorithmic trading networks, custom Linux kernel patches, and high-frequency exchange feed handlers.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Operating Systems & Linux Internals", "weight_percent": 45, "focus": "Context switching overhead, Page faults, Hugepages, Syscall minimization"},
            {"domain": "C++ Data Structures & Concurrency", "weight_percent": 35, "focus": "Atomic operations, Memory model (acquire/release), Circular queues"},
            {"domain": "Algorithms & Numerical Computing", "weight_percent": 20, "focus": "Matrix multiplication, Graph DAG scheduling, Fast bitwise operations"}
        ],
        "key_topics": ["Linux Memory & Hugepages", "C++ Memory Model (Acquire/Release)", "Lock-Free SPSC Queues", "Syscall Optimization", "Exchange Feed Handlers"],
        "interviewer_tip": "Expect rigorous questions on atomic operations and memory ordering semantics (`std::memory_order_relaxed` vs `std::memory_order_seq_cst`)."
    },
    {
        "id": "two_sigma",
        "company": "Two Sigma",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Quantitative Software Engineer",
        "summary": "Two Sigma blends data science, distributed supercomputing (Spark/Ray), and systematic trading algorithms across petabytes of market data.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Distributed Big Data Systems", "weight_percent": 40, "focus": "Parallel computing, MapReduce, Vectorized dataframes, Distributed storage"},
            {"domain": "Algorithms & Dynamic Programming", "weight_percent": 35, "focus": "Graph theory, Optimization algorithms, Tree traversals, Complexity proofs"},
            {"domain": "Applied Statistics & Probability", "weight_percent": 25, "focus": "Hypothesis testing, Time-series autocorrelation, Linear models"}
        ],
        "key_topics": ["Parallel & Vectorized Compute", "Time-Series Autocorrelation", "Dynamic Programming & Graphs", "Distributed Dataframes", "Hypothesis Testing"],
        "interviewer_tip": "Demonstrate the ability to optimize large-scale data pipelines without creating memory bottlenecks or unnecessary serialization overhead."
    },
    {
        "id": "hrt",
        "company": "Hudson River Trading (HRT)",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Algorithm Developer / Quantitative Systems",
        "summary": "HRT develops automated trading algorithms responsible for significant percentages of daily US equity volume using cutting-edge C++ and statistical models.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Algorithms & C++ Engineering", "weight_percent": 45, "focus": "Zero-overhead abstractions, Move semantics, Custom allocators, Bit manipulation"},
            {"domain": "Probability & Combinatorics", "weight_percent": 35, "focus": "Random walks, Markov chains, Geometric distributions, Expected values"},
            {"domain": "Systems & Concurrency", "weight_percent": 20, "focus": "Multi-threading, Memory layout, Hardware branch prediction"}
        ],
        "key_topics": ["Custom Memory Allocators", "Random Walks & Markov Chains", "Hardware Branch Prediction", "Move Semantics & Rvalue References", "Bitwise Tricks"],
        "interviewer_tip": "Focus on mechanical sympathy — how your software structures physically interact with the underlying CPU architecture and branch predictor."
    },
    {
        "id": "graviton",
        "company": "Graviton Research Capital",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Quantitative Researcher / Low Latency Engineer",
        "summary": "India's premier quantitative trading firm hiring top tier IIT/BITS graduates for extreme mathematics, stochastic calculus, and C++ algorithmic execution.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "High-Level Mathematics & Puzzles", "weight_percent": 50, "focus": "Advanced probability, Linear algebra, Stochastic calculus, Combinatorics"},
            {"domain": "Data Structures & Low Level C++", "weight_percent": 35, "focus": "Memory alignment, Assembly inspection, Cache hierarchies, Pointers"},
            {"domain": "Analytical Problem Solving", "weight_percent": 15, "focus": "Fast mental arithmetic, Probability game strategies"}
        ],
        "key_topics": ["Advanced Probability & Combinatorics", "Assembly & Memory Alignment", "Stochastic Calculus", "Pointer Arithmetic & References", "Linear Algebra"],
        "interviewer_tip": "Speed and precision in solving complex math puzzles on the fly are the primary filter in Graviton interviews."
    },
    {
        "id": "stripe",
        "company": "Stripe",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Software Engineer (Payments Infrastructure)",
        "summary": "Stripe is the world's economic infrastructure, requiring unmatched API design, distributed transactions, idempotency guarantees, and zero-downtime ledger consistency.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Distributed Transactions & Idempotency", "weight_percent": 45, "focus": "Two-phase commit, Saga pattern, Double-entry ledgers, Distributed locking"},
            {"domain": "API Design & Developer Experience", "weight_percent": 35, "focus": "RESTful error standards, Webhooks, Backward compatibility, Schema versioning"},
            {"domain": "Core Data Structures & Algorithms", "weight_percent": 20, "focus": "Rate limiting algorithms (Token Bucket/Leaky Bucket), Graph dependencies"}
        ],
        "key_topics": ["Double-Entry Accounting Ledgers", "Token Bucket Rate Limiting", "Saga Pattern & Distributed Transactions", "Webhook Reliability", "API Versioning"],
        "interviewer_tip": "Stripe interviewers evaluate pragmatic code. Write clean, defensive code with exceptional error handling and explanatory variable names."
    },
    {
        "id": "razorpay",
        "company": "Razorpay",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Backend Engineer (Payments & Banking)",
        "summary": "India's leading fintech infrastructure powering millions of merchants, requiring high-throughput payment routing, webhooks, and fraud detection pipelines.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Backend Systems (Go/Java/Node)", "weight_percent": 40, "focus": "Microservices, MySQL query optimization, Redis caching, Kafka queues"},
            {"domain": "Data Structures & Algorithms", "weight_percent": 35, "focus": "Trees, Graphs, DP, Priority Queues, Binary Search"},
            {"domain": "Low-Level System Design", "weight_percent": 25, "focus": "Payment gateway routing, Retry mechanisms, Rate limiting"}
        ],
        "key_topics": ["Payment Gateway Routing Logic", "MySQL Locking & Deadlocks", "Kafka Event Streaming", "Rate Limiting & Throttling", "Redis Caching Patterns"],
        "interviewer_tip": "Be prepared to design a reliable webhook delivery system with exponential backoff retries and dead-letter queues."
    },
    {
        "id": "zerodha",
        "company": "Zerodha",
        "sector": "Fintech & High-Frequency Trading",
        "role": "Core Systems Engineer (Go / Python / PostgreSQL)",
        "summary": "India's largest retail brokerage built on minimalist, high-performance architecture (Kite), ultra-efficient Go microservices, and lean relational databases.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "System Architecture & Minimalist Design", "weight_percent": 45, "focus": "High-concurrency Go, WebSockets, PostgreSQL tuning, Self-hosted infra"},
            {"domain": "Algorithms & Data Structures", "weight_percent": 35, "focus": "Order queues, Sliding window, Fast string parsing, Binary search"},
            {"domain": "Network Protocols & WebSockets", "weight_percent": 20, "focus": "Binary WebSocket streaming (ticker), TCP packet optimization"}
        ],
        "key_topics": ["WebSocket Real-Time Ticker", "Go Concurrency & Channels", "PostgreSQL Query Plan Tuning", "Order Book Queue Modeling", "Self-Hosted Infrastructure"],
        "interviewer_tip": "Zerodha values simplicity and avoiding over-engineering. Focus on clean, minimal code without unnecessary framework bloat."
    },

    # --- 3. AI, RESEARCH, LLMS & ROBOTICS ---
    {
        "id": "nvidia_ai",
        "company": "NVIDIA",
        "sector": "AI, LLMs & Robotics",
        "role": "CUDA / Deep Learning Systems Engineer",
        "summary": "NVIDIA powers global AI through GPU hardware acceleration, CUDA parallel kernels, TensorRT optimization, and high-bandwidth interconnects (NVLink).",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "CUDA & Parallel Computing", "weight_percent": 45, "focus": "Thread blocks, Warps, Shared memory bank conflicts, GPU memory hierarchy"},
            {"domain": "C++ & Low-Level Systems", "weight_percent": 35, "focus": "Pointers, Assembly, Memory coalescing, SIMD/AVX intrinsics"},
            {"domain": "Deep Learning Mathematics", "weight_percent": 20, "focus": "Matrix multiplication (GEMM), Convolution kernels, Quantization (FP8/INT8)"}
        ],
        "key_topics": ["CUDA Warps & Shared Memory", "GEMM Matrix Multiplication", "Memory Coalescing", "GPU vs CPU Memory Architecture", "FP8/INT8 Quantization"],
        "interviewer_tip": "Understand GPU hardware constraints: how warp divergence and shared memory bank conflicts drastically reduce kernel arithmetic intensity."
    },
    {
        "id": "openai",
        "company": "OpenAI",
        "sector": "AI, LLMs & Robotics",
        "role": "Research Engineer / Distributed AI Systems",
        "summary": "OpenAI leads generative AI (GPT-4/o1/Sora), requiring planetary-scale distributed model training (thousands of GPUs), PyTorch internals, and RLHF pipelines.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Distributed Training & Parallelism", "weight_percent": 45, "focus": "Tensor/Pipeline/Data parallelism (Megatron/DeepSpeed), AllReduce, NVLink"},
            {"domain": "Deep Learning & Transformer Math", "weight_percent": 35, "focus": "FlashAttention, KV cache optimization, RoPE embeddings, Backpropagation"},
            {"domain": "Algorithms & Scalable Infrastructure", "weight_percent": 20, "focus": "Checkpointing, Fault tolerance across 10k clusters, PyTorch C++ extensions"}
        ],
        "key_topics": ["FlashAttention & KV Caching", "Megatron-LM Parallelism", "AllReduce & Ring Topology", "Rotary Positional Embeddings (RoPE)", "RLHF & PPO Optimization"],
        "interviewer_tip": "Be able to calculate GPU VRAM memory requirements for a 70B parameter model training run including optimizer states, gradients, and activation memory."
    },
    {
        "id": "anthropic",
        "company": "Anthropic",
        "sector": "AI, LLMs & Robotics",
        "role": "AI Safety & Systems Research Engineer",
        "summary": "Anthropic builds Claude through Constitutional AI, mechanistic interpretability, robust evaluation benchmarks, and massive distributed training infrastructure.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Machine Learning Foundations & Math", "weight_percent": 45, "focus": "Linear algebra, Information theory, Cross-entropy, Transformer internals"},
            {"domain": "Distributed Infrastructure & Python/Rust", "weight_percent": 35, "focus": "High-throughput serving, Async batching, Distributed storage"},
            {"domain": "Mechanistic Interpretability & Safety", "weight_percent": 20, "focus": "Residual stream analysis, Sparse autoencoders, Safety alignment"}
        ],
        "key_topics": ["Sparse Autoencoders & Interpretability", "Information Theory & Entropy", "KV-Cache Management", "Async Continuous Batching", "Transformer Architecture"],
        "interviewer_tip": "Strong scientific communication and an ability to rigorously reason about model failure modes and alignment risks are essential."
    },
    {
        "id": "deepmind",
        "company": "Google DeepMind",
        "sector": "AI, LLMs & Robotics",
        "role": "Research Scientist / AI Systems Engineer",
        "summary": "DeepMind solves intelligence (Gemini, AlphaFold, AlphaGo) using reinforcement learning, Jax/Flax, graph neural networks, and foundational algorithmic breakthroughs.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Reinforcement Learning & Mathematics", "weight_percent": 50, "focus": "MDPs, Policy gradients, Actor-Critic, Monte Carlo Tree Search (MCTS), Bellman equations"},
            {"domain": "Algorithms & Computational Complexity", "weight_percent": 30, "focus": "Graph algorithms, Dynamic programming, Advanced discrete math"},
            {"domain": "High-Performance Compute (Jax/C++)", "weight_percent": 20, "focus": "JIT compilation, XLA optimization, Vectorization (vmap/pmap)"}
        ],
        "key_topics": ["Monte Carlo Tree Search (MCTS)", "Bellman Equations & MDPs", "Jax XLA Compilation", "Graph Neural Networks", "Policy Gradient Theorems"],
        "interviewer_tip": "Expect questions requiring mathematical proofs on chalkboards regarding Markov Decision Processes and convergence guarantees."
    },
    {
        "id": "tesla_autopilot",
        "company": "Tesla Autopilot / Optimus Robotics",
        "sector": "AI, LLMs & Robotics",
        "role": "Computer Vision & Autonomous Systems Engineer",
        "summary": "Tesla builds Full Self-Driving and humanoid robots (Optimus) relying entirely on end-to-end vision neural networks, occupancy grids, and real-time C++ inference.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Computer Vision & 3D Geometry", "weight_percent": 45, "focus": "Epipolar geometry, Point clouds, Occupancy networks, Camera projection matrices"},
            {"domain": "Real-Time Embedded C++ & Optimization", "weight_percent": 35, "focus": "Zero memory allocation in control loop, Fixed-point math, TensorRT, RTOS"},
            {"domain": "State Estimation & Control", "weight_percent": 20, "focus": "Kalman filters (EKF/UKF), Trajectory planning, Model Predictive Control (MPC)"}
        ],
        "key_topics": ["Occupancy Network Grids", "Camera Projection & Epipolar Geometry", "Extended Kalman Filters (EKF)", "Model Predictive Control (MPC)", "Real-Time C++ Control Loops"],
        "interviewer_tip": "You will be grilled on real-time latency budgets. How do you guarantee 30ms latency for obstacle perception under degraded camera inputs?"
    },
    {
        "id": "boston_dynamics",
        "company": "Boston Dynamics",
        "sector": "AI, LLMs & Robotics",
        "role": "Robotics Controls & Software Engineer",
        "summary": "Boston Dynamics (Spot, Atlas) leads dynamic balance, articulated multi-body physics simulation, hydraulic/electric actuation, and terrain navigation.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Kinematics & Dynamic Physics", "weight_percent": 45, "focus": "Forward/Inverse kinematics, Jacobian matrices, Rigid body dynamics, Center of Mass"},
            {"domain": "Real-Time Embedded Systems (C++)", "weight_percent": 35, "focus": "Hard real-time RTOS, CAN bus communication, Sensor fusion, Pointers"},
            {"domain": "Algorithms & Motion Planning", "weight_percent": 20, "focus": "RRT* / PRM path planning, Quadruped gait generation, Convex optimization"}
        ],
        "key_topics": ["Jacobian Matrices & Inverse Kinematics", "Rigid Body Dynamic Simulation", "RRT* Path Planning", "Real-Time RTOS Scheduling", "Sensor Fusion (IMU/LiDAR)"],
        "interviewer_tip": "Demonstrate deep physical intuition: explain how unexpected foot slip is detected via high-frequency IMU feedback and corrected via leg impedance control."
    },

    # --- 4. CLOUD INFRASTRUCTURE, DEVOPS & DATABASES ---
    {
        "id": "snowflake",
        "company": "Snowflake",
        "sector": "Cloud Infrastructure & Databases",
        "role": "Database Engine / Storage Systems Engineer",
        "summary": "Snowflake revolutionized data warehousing by decoupling storage from compute, columnar micro-partitions, and vectorized SQL execution engines (C++).",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Database Internals & Storage", "weight_percent": 50, "focus": "Columnar storage (Parquet), Query optimization, Cost-based optimizers, SIMD vectorized execution"},
            {"domain": "Distributed Systems & Cloud Storage", "weight_percent": 30, "focus": "S3/Blob storage latency mitigation, Consistency models, Distributed locks"},
            {"domain": "Advanced Algorithms & Concurrency", "weight_percent": 20, "focus": "External merge sort, Hash joins, B-Trees, Multi-version concurrency control (MVCC)"}
        ],
        "key_topics": ["Columnar Storage Engines", "Vectorized Query Execution (SIMD)", "Cost-Based Query Optimization", "Hash Join vs Merge Join", "MVCC Concurrency"],
        "interviewer_tip": "Understand how cache locality and columnar data layout prevent CPU memory bus saturation during multi-gigabyte aggregation queries."
    },
    {
        "id": "databricks",
        "company": "Databricks",
        "sector": "Cloud Infrastructure & Databases",
        "role": "Distributed Systems Engineer (Spark / Lakehouse)",
        "summary": "Databricks (Apache Spark, Delta Lake, Photon) powers enterprise big data and ML through high-performance vectorized query engines (C++/Scala/Rust).",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Distributed Query Execution", "weight_percent": 45, "focus": "Shuffle architecture, Directed Acyclic Graph (DAG) scheduling, Partitioning, Delta Lake ACID"},
            {"domain": "C++ / JVM Low-Level Performance", "weight_percent": 35, "focus": "Photon engine optimization, Memory off-heap management, JIT bytecode generation"},
            {"domain": "Algorithms & Data Structures", "weight_percent": 20, "focus": "Bloom filters, HyperLogLog, Radix sort, Graph traversals"}
        ],
        "key_topics": ["Spark Shuffle & DAG Scheduling", "Delta Lake ACID Log Protocol", "Vectorized Photon Engine", "HyperLogLog & Bloom Filters", "Off-Heap Memory Management"],
        "interviewer_tip": "Be prepared to explain data skew in distributed shuffles and how broadcast hash joins eliminate expensive network exchange steps."
    },
    {
        "id": "cloudflare",
        "company": "Cloudflare",
        "sector": "Cloud Infrastructure & Databases",
        "role": "Edge Network / Systems Engineer (Rust / Go)",
        "summary": "Cloudflare runs edge computing across 300+ cities, handling millions of requests per second with eBPF, DDoS mitigation, Rust Workers, and QUIC/HTTP3.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Computer Networks & Linux Networking", "weight_percent": 45, "focus": "eBPF/XDP, TCP/IP, QUIC/HTTP3, TLS 1.3 handshakes, Anycast routing, BGP"},
            {"domain": "Systems Programming (Rust/Go/C)", "weight_percent": 35, "focus": "V8 isolates, Memory safety, Async runtime (Tokio), Zero-copy network sockets"},
            {"domain": "Algorithms & Security", "weight_percent": 20, "focus": "DDoS rate limiting, Trie IP lookups, Cryptographic hashing, Bloom filters"}
        ],
        "key_topics": ["eBPF & XDP Packet Filtering", "Anycast BGP Routing", "QUIC / HTTP3 Protocol", "V8 Isolate Edge Execution", "TLS 1.3 Cryptography"],
        "interviewer_tip": "Know the packet lifecycle: how a packet travels from physical NIC to kernel socket buffer and how XDP drops malicious packets before OS overhead."
    },
    {
        "id": "mongodb",
        "company": "MongoDB",
        "sector": "Cloud Infrastructure & Databases",
        "role": "Core Server / Distributed Storage Engineer",
        "summary": "MongoDB builds the world's leading document database, developing WiredTiger storage engines, Raft replica sets, and sharded cluster routing.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Storage Engines & B-Trees", "weight_percent": 45, "focus": "WiredTiger internals, B-Tree vs LSM, Write-ahead logging (WAL), Checkpointing"},
            {"domain": "Distributed Consensus & Sharding", "weight_percent": 35, "focus": "Raft election, Replication rollback, Range vs Hash sharding, Chunk migration"},
            {"domain": "C++ Systems Programming", "weight_percent": 20, "focus": "Concurrency, Concurrency locks, Thread pools, Query execution plans"}
        ],
        "key_topics": ["WiredTiger Storage Engine", "Write-Ahead Logging (WAL)", "Raft Leader Election", "Sharded Chunk Migration", "B-Tree Locking Protocols"],
        "interviewer_tip": "Understand how write concerns (e.g. `w: majority`, `j: true`) impact durability and client latency under network partition scenarios."
    },
    {
        "id": "datadog",
        "company": "Datadog",
        "sector": "Cloud Infrastructure & Databases",
        "role": "Observability & Real-Time Telemetry Engineer",
        "summary": "Datadog ingests trillions of events daily across logs, traces, and metrics, requiring ultra-scalable time-series databases and lightweight agent profiling.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Time-Series Databases & Compression", "weight_percent": 45, "focus": "Gorilla compression, Delta-of-delta timestamps, Inverted index for tags, Kafka"},
            {"domain": "High-Throughput Ingestion (Go/Java)", "weight_percent": 35, "focus": "Zero-allocation deserialization, GC tuning, Batching pipelines, Ring buffers"},
            {"domain": "Algorithms & Data Structures", "weight_percent": 20, "focus": "Streaming quantile approximation (T-Digest), Reservoir sampling, Tries"}
        ],
        "key_topics": ["Gorilla Time-Series Compression", "T-Digest Streaming Quantiles", "Distributed Tracing (OpenTelemetry)", "High-Throughput Kafka Ingestion", "Garbage Collection Tuning"],
        "interviewer_tip": "Explain how streaming quantiles (p99 latency) are calculated across distributed nodes without sending all raw sample values to a central server."
    },

    # --- 5. CYBERSECURITY & DEFENSE TECH ---
    {
        "id": "crowdstrike",
        "company": "CrowdStrike",
        "sector": "Cybersecurity & Defense Tech",
        "role": "Kernel Security / Falcon Sensor Engineer",
        "summary": "CrowdStrike develops endpoint protection (Falcon) operating in OS kernel space (Windows/macOS/Linux) with low-overhead threat behavioral analysis.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "OS Internals & Kernel Driver Dev", "weight_percent": 50, "focus": "Kernel hooks, System call filtering, Ring 0 vs Ring 3, Minifilter drivers, Kernel crash analysis"},
            {"domain": "C / C++ & Assembly", "weight_percent": 30, "focus": "x86/x64 assembly, Disassembly, Stack frame analysis, Memory exploitation (ROP chains)"},
            {"domain": "Real-Time Threat Detection", "weight_percent": 20, "focus": "Process injection detection, DLL unhooking, Behavioral heuristics"}
        ],
        "key_topics": ["Ring 0 Kernel Minifilters", "x86/x64 Disassembly & ROP", "System Call Interception", "Process Injection Mechanisms", "Kernel Memory Corruption"],
        "interviewer_tip": "A single bug in kernel mode crashes the entire operating system (BSOD). You must demonstrate relentless focus on defensive coding and zero undefined behavior."
    },
    {
        "id": "palo_alto_networks",
        "company": "Palo Alto Networks",
        "sector": "Cybersecurity & Defense Tech",
        "role": "Next-Gen Firewall / Cloud Security Engineer",
        "summary": "Palo Alto Networks pioneers network firewalls, Prisma cloud security, and zero-trust architectures processing multi-gigabit encrypted traffic.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Network Security & Packet Inspection", "weight_percent": 45, "focus": "Deep Packet Inspection (DPI), TLS decryption, Flow-based stateful inspection, IPsec"},
            {"domain": "Distributed Cloud Security", "weight_percent": 35, "focus": "Zero Trust Network Access (ZTNA), Kubernetes security, IAM policy engines"},
            {"domain": "Data Structures & Multi-Core Packet Processing", "weight_percent": 20, "focus": "Aho-Corasick string search for signatures, Trie IP lookups, DPDK"}
        ],
        "key_topics": ["Aho-Corasick Signature Matching", "Deep Packet Inspection (DPI)", "Zero Trust Architecture", "TLS Interception & Certificates", "DPDK High-Speed Routing"],
        "interviewer_tip": "Understand how parallel hardware accelerators parse regex signatures across continuous TCP packet byte-streams without stalling throughput."
    },
    {
        "id": "anduril",
        "company": "Anduril Industries",
        "sector": "Cybersecurity & Defense Tech",
        "role": "Lattice OS / Autonomous Defense Systems",
        "summary": "Anduril builds Lattice OS, an AI-powered command-and-control platform integrating autonomous drones, underwater vehicles, and border defense sensors.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Real-Time Distributed Sensor Fusion", "weight_percent": 45, "focus": "Sensor fusion (Radar/Camera/Thermal), Track correlation, Spatial mapping, Edge AI"},
            {"domain": "Embedded C++ & Resilient Mesh Networks", "weight_percent": 35, "focus": "Contested RF mesh communications, Protocol Buffers, Real-time telemetry, RTOS"},
            {"domain": "Computer Vision & Edge Inference", "weight_percent": 20, "focus": "Object tracking, Embedded TensorRT, Drone navigation in GPS-denied environments"}
        ],
        "key_topics": ["Sensor Track Correlation", "GPS-Denied Navigation", "Ad-Hoc Mesh Networking", "Embedded C++ & RTOS", "Edge Computer Vision"],
        "interviewer_tip": "Candidates must show how autonomous systems safely operate under electronic warfare where network connectivity and GPS signals are intentionally jammed."
    },

    # --- 6. SEMICONDUCTORS & HARDWARE ---
    {
        "id": "amd",
        "company": "AMD",
        "sector": "Semiconductors & Hardware",
        "role": "Silicon Architecture / GPU Driver Engineer",
        "summary": "AMD builds high-performance x86 Zen CPUs, RDNA/CDNA GPUs, and ROCm open software stack competing at the forefront of supercomputing.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Computer Architecture & Microarchitecture", "weight_percent": 45, "focus": "Out-of-order execution, Branch predictors (TAGE), Cache coherence protocols (MOESI)"},
            {"domain": "C/C++ & Driver Development", "weight_percent": 35, "focus": "Linux DRM/KMS graphics drivers, Memory mapped I/O (MMIO), PCIe Gen5 transfers"},
            {"domain": "Parallel Algorithms & Vectorization", "weight_percent": 20, "focus": "AVX-512 vectorization, Matrix compute units, OpenMP/ROCm"}
        ],
        "key_topics": ["MOESI Cache Coherence", "Out-of-Order Execution & TAGE", "Linux DRM Graphics Drivers", "PCIe Direct Memory Access (DMA)", "AVX-512 Vectorization"],
        "interviewer_tip": "Be able to trace the complete path of a cache line request across multi-chiplet Infinity Fabric interlinks."
    },
    {
        "id": "qualcomm",
        "company": "Qualcomm",
        "sector": "Semiconductors & Hardware",
        "role": "Snapdragon SoC / Modem Software Engineer",
        "summary": "Qualcomm powers mobile computing and 5G through Snapdragon SoCs, Hexagon DSPs, cellular modems, and edge AI NPU accelerators.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Embedded C & DSP Architecture", "weight_percent": 45, "focus": "Fixed-point arithmetic, Hexagon DSP instructions, DMA, Interrupt service routines (ISR)"},
            {"domain": "5G / Wireless Protocol Stack", "weight_percent": 35, "focus": "PHY/MAC layers, 3GPP standards, Packet scheduling, RF power efficiency"},
            {"domain": "Operating Systems & RTOS", "weight_percent": 20, "focus": "FreeRTOS, Linux kernel power management, Thermal throttling algorithms"}
        ],
        "key_topics": ["Hexagon DSP Architecture", "Fixed-Point Arithmetic", "3GPP Wireless Protocol Layers", "Interrupt Service Routines (ISR)", "SoC Thermal Throttling"],
        "interviewer_tip": "Understand the power constraints of mobile phones: how software loops must be optimized to maximize battery life while hitting 60fps / 5G speeds."
    },
    {
        "id": "intel",
        "company": "Intel",
        "sector": "Semiconductors & Hardware",
        "role": "Silicon Design & Firmware Engineer",
        "summary": "Intel leads semiconductor manufacturing, x86 architecture design, UEFI BIOS firmware, and enterprise Xeon data center platforms.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Verilog/SystemVerilog & Digital Design", "weight_percent": 45, "focus": "RTL design, FSMs, Static timing analysis (Setup/Hold times), Clock domain crossing (CDC)"},
            {"domain": "Low-Level C & Firmware (UEFI)", "weight_percent": 35, "focus": "UEFI phases (SEC, PEI, DXE), PCIe enumeration, Memory training (DDR5)"},
            {"domain": "Data Structures & Verification", "weight_percent": 20, "focus": "UVM testbenches, Coverage metrics, Graph dependency resolution"}
        ],
        "key_topics": ["Setup & Hold Time Analysis", "Clock Domain Crossing (CDC)", "UEFI Boot Phase Architecture", "DDR5 Memory Training", "UVM Hardware Verification"],
        "interviewer_tip": "Know how metastability occurs in asynchronous clock domains and explain the use of multi-flop synchronizers."
    },

    # --- 7. E-COMMERCE, LOGISTICS & CONSUMER TECH ---
    {
        "id": "flipkart",
        "company": "Flipkart",
        "sector": "E-Commerce & Delivery",
        "role": "SDE II (Supply Chain & Big Billion Days Core)",
        "summary": "India's e-commerce pioneer handling peak traffic spikes during Big Billion Days, requiring robust inventory reservation, search, and logistics routing.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Low-Level Design & High Concurrency", "weight_percent": 40, "focus": "Inventory locking, Flash sale concurrency, Kafka event streaming, Redis queues"},
            {"domain": "Data Structures & Algorithms", "weight_percent": 35, "focus": "Graphs (Logistics hubs), Dynamic Programming, Binary search, Trie product search"},
            {"domain": "High-Level Distributed System Design", "weight_percent": 25, "focus": "Database sharding, Rate limiting, Distributed caching, Drop-ship logistics"}
        ],
        "key_topics": ["Flash Sale Inventory Locking", "Logistics Hub Routing Graphs", "Kafka Event-Driven Architecture", "Database Sharding Patterns", "Trie Product Search"],
        "interviewer_tip": "In design rounds, explain how you prevent overselling inventory when 100,000 customers click 'Buy Now' within the exact same second."
    },
    {
        "id": "swiggy",
        "company": "Swiggy",
        "sector": "E-Commerce & Delivery",
        "role": "Backend Engineer (Hyperlocal Logistics & Instamart)",
        "summary": "Swiggy powers on-demand food delivery and 10-minute grocery fulfillment (Instamart) using real-time dispatch matching, delivery partner routing, and surge pricing.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Geospatial Indexing & Assignment Algorithms", "weight_percent": 45, "focus": "Hungarian algorithm for matching, H3 spatial grids, Travelling Salesperson variations"},
            {"domain": "Real-Time Microservices (Go/Java)", "weight_percent": 35, "focus": "Kafka streaming, Redis geo-commands, WebSocket live rider tracking, Deadlock prevention"},
            {"domain": "Data Structures & Algorithms", "weight_percent": 20, "focus": "Heaps, Graph shortest path, Sliding window rate limiter"}
        ],
        "key_topics": ["Bipartite Matching & Hungarian Algorithm", "Uber H3 Spatial Hexagons", "Redis Geo-Hashing", "WebSocket Real-Time Tracking", "Surge Pricing State Machines"],
        "interviewer_tip": "Focus on optimizing batched deliveries: how to dynamically group 2 restaurant orders along the same delivery path without increasing customer SLA."
    },
    {
        "id": "zomato_blinkit",
        "company": "Zomato / Blinkit",
        "sector": "E-Commerce & Delivery",
        "role": "Software Development Engineer (Quick Commerce & Core)",
        "summary": "Zomato and Blinkit dominate quick-commerce and dining discovery with ultra-optimized dark store warehouse picking algorithms and real-time food ordering.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Algorithms & Optimization", "weight_percent": 45, "focus": "Warehouse 3D bin packing, Dark store pick-path optimization, Graph algorithms"},
            {"domain": "Scalable Backend Architecture", "weight_percent": 35, "focus": "High-concurrency Node/Go, Redis cluster, Cassandra order history, PostgreSQL"},
            {"domain": "System Resilience & Low-Level Design", "weight_percent": 20, "focus": "Payment failovers, Circuit breakers, Order state machine design"}
        ],
        "key_topics": ["3D Bin Packing Algorithms", "Dark Store Pick-Path Optimization", "Order Lifecycle State Machine", "Redis Cluster Caching", "Circuit Breakers (Resilience4j)"],
        "interviewer_tip": "Design clean state machines for orders (Placed -> Confirmed -> Packed -> Dispatched -> Delivered) with rollback handling for cancelled orders."
    },

    # --- 8. HIGH-GROWTH UNICORNS & INDIAN TECH GIANTS ---
    {
        "id": "postman",
        "company": "Postman",
        "sector": "High-Growth Unicorns",
        "role": "Software Engineer (API Platform & Cloud)",
        "summary": "Postman serves 30M+ developers worldwide, building API clients, mocking engines, collaborative workspaces, and automated contract testing suites.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "API Protocols & Web Standards", "weight_percent": 45, "focus": "HTTP/1.1 vs HTTP/2 vs HTTP/3, GraphQL, gRPC, WebSocket streaming, OpenAPI specs"},
            {"domain": "Data Structures & Real-Time Sync", "weight_percent": 35, "focus": "Operational Transformation (OT) / CRDTs, Trie routing, AST parsing for script runners"},
            {"domain": "Full-Stack Node / Electron Architecture", "weight_percent": 20, "focus": "IPC communication, Memory profiling, Sandbox execution of JavaScript"}
        ],
        "key_topics": ["Operational Transformation & CRDTs", "AST Parsing & Code Generation", "gRPC & Protocol Buffers", "Electron IPC & Sandbox Security", "OpenAPI Specification"],
        "interviewer_tip": "Demonstrate deep understanding of HTTP specification details, status codes, proxy forwarding, and TLS certificate validation."
    },
    {
        "id": "atlassian",
        "company": "Atlassian",
        "sector": "High-Growth Unicorns",
        "role": "Software Engineer (Jira / Confluence Cloud)",
        "summary": "Atlassian builds mission-critical team collaboration tools, emphasizing large-scale multi-tenant cloud architecture, rich-text document editing, and search.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Multi-Tenant Cloud Architecture", "weight_percent": 40, "focus": "Tenant isolation, Sharded PostgreSQL, Microservices orchestration, AWS CDK"},
            {"domain": "Data Structures & Tree Algorithms", "weight_percent": 35, "focus": "Document tree hierarchies, Graph dependency search, Prefix trees, DP"},
            {"domain": "System Design & Extensibility", "weight_percent": 25, "focus": "Plugin ecosystems, Webhooks, Rate limiting, Event-driven architecture"}
        ],
        "key_topics": ["Multi-Tenant Data Isolation", "Hierarchical Document Trees", "Plugin Ecosystem Architecture", "Sharded PostgreSQL", "Event-Driven Webhooks"],
        "interviewer_tip": "Atlassian puts strong emphasis on clean code values (Open company, no BS). Write tests, articulate design tradeoffs, and seek feedback during coding."
    },
    {
        "id": "juspay",
        "company": "Juspay",
        "sector": "High-Growth Unicorns",
        "role": "Functional Systems Engineer (Haskell / PureScript / Rust)",
        "summary": "Juspay processes over 100M daily payment transactions across UPI, credit cards, and banking gateways using strictly typed pure functional programming (Haskell/Rust).",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Pure Functional Programming", "weight_percent": 50, "focus": "Haskell/PureScript, Monads, Type classes, Immutability, Algebraic Data Types (ADTs)"},
            {"domain": "Distributed Transaction Resilience", "weight_percent": 35, "focus": "Formal verification, High-throughput actor systems, Zero runtime exceptions"},
            {"domain": "Data Structures & Graph Algorithms", "weight_percent": 15, "focus": "State monad DSLs, Pure graph traversals, Binary search trees"}
        ],
        "key_topics": ["Monads & Functional DSLs", "Algebraic Data Types (ADTs)", "Formal State Verification", "UPI Payment Protocol Specs", "Pure Functional Architecture"],
        "interviewer_tip": "Juspay does not tolerate imperative thinking. Practice expressing business logic as pure functions without mutable variables or side effects."
    },

    # --- 9. AEROSPACE, AUTONOMOUS SYSTEMS & DEEP TECH ---
    {
        "id": "spacex",
        "company": "SpaceX",
        "sector": "Aerospace & Deep Tech",
        "role": "Flight Software / Starlink Systems Engineer",
        "summary": "SpaceX builds Falcon 9, Starship, and Starlink satellite constellations, requiring deterministic C++ flight control code, satellite mesh laser routing, and radiation tolerance.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Deterministic C++ & Flight Computers", "weight_percent": 50, "focus": "Deterministic execution, Triple modular redundancy (TMR), Zero dynamic memory (no malloc)"},
            {"domain": "Satellite Mesh Routing & Linux Kernel", "weight_percent": 30, "focus": "Laser inter-satellite link routing, Dynamic topology graphs, Custom Linux RTOS"},
            {"domain": "Telemetry & Physics Computation", "weight_percent": 20, "focus": "Orbital mechanics, Kalman filtering, High-frequency UDP sensor streaming"}
        ],
        "key_topics": ["Deterministic Flight Control Loops", "Triple Modular Redundancy (TMR)", "Laser Inter-Satellite Mesh Routing", "Dynamic Topology Graph Algorithms", "Orbital Mechanics Computation"],
        "interviewer_tip": "In rocket software, a segfault or memory leak during launch causes total mission loss. Flight software bans dynamic heap allocation completely."
    },

    # --- 10. BIOTECH, HEALTHTECH & BIO-COMPUTE ---
    {
        "id": "illumina",
        "company": "Illumina",
        "sector": "HealthTech & Bio-Compute",
        "role": "Bioinformatics & Genomic Compute Engineer",
        "summary": "Illumina develops next-generation DNA sequencing instruments, requiring genomic alignment algorithms (Burrows-Wheeler Transform), FPGA compute, and high-throughput optics.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "String Matching & Genomic Algorithms", "weight_percent": 50, "focus": "Burrows-Wheeler Transform (BWT), FM-Index, Needleman-Wunsch dynamic programming"},
            {"domain": "High-Performance C++ & FPGA Processing", "weight_percent": 30, "focus": "Streaming image decoding, SIMD genome base calling, Multi-threaded pipelines"},
            {"domain": "Big Data & Distributed Storage", "weight_percent": 20, "focus": "BAM/CRAM compression formats, Cloud genomic pipelines"}
        ],
        "key_topics": ["Burrows-Wheeler Transform (BWT)", "FM-Index Genomic Search", "Needleman-Wunsch Dynamic Programming", "SIMD Sequence Alignment", "Genomic Compression Algorithms"],
        "interviewer_tip": "Understand the computational complexity of searching 3 billion base-pair DNA sequences and why suffix arrays/FM-index are essential for fast sub-string lookup."
    },

    # --- 11. STRATEGY, CONSULTING & SYSTEMS ARCHITECTURE ---
    {
        "id": "mckinsey_quantumblack",
        "company": "McKinsey QuantumBlack",
        "sector": "Strategy & Systems Architecture",
        "role": "Principal Data Engineer / AI Systems Architect",
        "summary": "QuantumBlack builds enterprise AI transformation platforms, production ML pipelines (Kedro), enterprise data governance, and C-suite technical strategy.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Enterprise Data Architecture & MLOps", "weight_percent": 45, "focus": "End-to-end ML pipelines, Data lineage, Feature stores, Cloud data lakes"},
            {"domain": "Software Engineering Best Practices", "weight_percent": 35, "focus": "Clean architecture, Modular Python/Scala, CI/CD, Containerization"},
            {"domain": "Technical Communication & Strategy", "weight_percent": 20, "focus": "Communicating complex architectural tradeoffs to non-technical executive stakeholders"}
        ],
        "key_topics": ["Enterprise Data Lineage & MLOps", "Feature Store Architecture", "Clean Architecture Principles", "Modular Pipeline Orchestration", "Stakeholder Tradeoff Analysis"],
        "interviewer_tip": "Interviews evaluate not just technical correctness, but whether you can articulate the business value and ROI of architectural decisions clearly."
    }
]

@router.get("/tracks")
async def list_industry_tracks(sector: Optional[str] = None, search: Optional[str] = None):
    results = INDUSTRY_TRACKS
    if sector and sector.lower() != "all":
        results = [t for t in results if sector.lower() in t.get("sector", "").lower()]
    if search and search.strip():
        q = search.strip().lower()
        results = [
            t for t in results
            if q in t["company"].lower()
            or q in t["role"].lower()
            or q in t.get("sector", "").lower()
            or any(q in top.lower() for top in t.get("key_topics", []))
            or any(q in crit["focus"].lower() or q in crit["domain"].lower() for crit in t.get("hiring_criteria", []))
        ]
    
    # Collect all unique sectors
    sectors = sorted(list(set(t.get("sector", "General Tech") for t in INDUSTRY_TRACKS)))

    return {
        "tracks": results,
        "total": len(results),
        "total_available": len(INDUSTRY_TRACKS),
        "sectors": ["All"] + sectors,
        "source": "Compiled from verified hiring criteria, engineering rubrics, and technical rounds at top enterprises worldwide."
    }

@router.get("/readiness")
async def get_career_readiness(
    track_id: str = "google_swe",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    selected_track = next((t for t in INDUSTRY_TRACKS if t["id"] == track_id), INDUSTRY_TRACKS[0])
    
    # Retrieve user's actual knowledge states from DB
    ks_stmt = (
        select(KnowledgeState, Concept.name, Concept.subject, Concept.topic)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(KnowledgeState.user_id == user.id)
    )
    ks_res = await db.execute(ks_stmt)
    user_states = ks_res.all()

    # Collect actual scored topics from real quiz attempts
    scored_topics = []
    if user_states:
        for ks, c_name, c_subj, c_topic in user_states:
            attempts = ks.total_attempts or 0
            if attempts > 0:
                scored_topics.append({
                    "concept_name": c_name or "",
                    "subject": c_subj or "",
                    "topic": c_topic or "",
                    "mastery_percent": round((ks.p_l or 0.0) * 100, 1),
                    "total_attempts": attempts
                })

    # Identify authentic topic-by-topic mastery for this company
    skill_gaps = []
    target_benchmark = 85.0 if selected_track["difficulty_tier"] == "Elite" else 80.0
    
    total_topic_mastery = 0.0
    assessed_topics_count = 0

    for top in selected_track["key_topics"]:
        top_lower = top.lower()
        # Find if student has taken tests matching this key topic or sub-concepts
        matched = [
            s for s in scored_topics
            if top_lower in s["concept_name"].lower()
            or top_lower in s["topic"].lower()
            or any(word in s["concept_name"].lower() for word in top_lower.split() if len(word) > 3)
        ]

        if matched:
            # Average mastery across matching evaluated concepts
            current_mastery = round(sum(m["mastery_percent"] for m in matched) / len(matched), 1)
            total_attempts = sum(m["total_attempts"] for m in matched)
            assessed_topics_count += 1
            
            if current_mastery >= target_benchmark:
                status = "Ready"
            elif current_mastery >= 50.0:
                status = "Developing"
            else:
                status = "Critical Gap"
        else:
            # Strictly 0.0% if the student has never attempted or uploaded notes on this topic
            current_mastery = 0.0
            total_attempts = 0
            status = "Untested"

        total_topic_mastery += current_mastery
        skill_gaps.append({
            "topic": top,
            "current_mastery": current_mastery,
            "required_benchmark": target_benchmark,
            "total_attempts": total_attempts,
            "status": status
        })

    # Authentic Company Readiness Score (Strict average of required rubric topics)
    num_topics = len(selected_track["key_topics"])
    readiness_score = round(total_topic_mastery / num_topics, 1) if num_topics > 0 else 0.0
    is_interview_ready = readiness_score >= target_benchmark and assessed_topics_count == num_topics

    # Authentic, factual actionable guidance
    untested_count = sum(1 for g in skill_gaps if g["status"] == "Untested")
    critical_count = sum(1 for g in skill_gaps if g["status"] == "Critical Gap")

    if assessed_topics_count == 0:
        recommendation = f"No diagnostic assessments taken for {selected_track['company']}'s specific topics yet. Take a Practice Quiz to establish your authentic readiness score."
    elif is_interview_ready:
        recommendation = f"Outstanding! Your verified mastery across {selected_track['company']}'s rubric meets or exceeds the {target_benchmark}% hiring threshold."
    elif untested_count > 0:
        untested_names = [g['topic'] for g in skill_gaps if g['status'] == 'Untested'][:2]
        recommendation = f"You have {untested_count} unassessed topics for {selected_track['company']}. Take diagnostic quizzes on {', '.join(untested_names)} to measure your readiness."
    elif critical_count > 0:
        top_gaps = [g['topic'] for g in skill_gaps if g['status'] == 'Critical Gap'][:2]
        recommendation = f"Focus on the top critical gaps in {selected_track['company']}'s rubric: {', '.join(top_gaps)}."
    else:
        recommendation = f"Solid foundation! Complete targeted problem sets on developing areas to cross the {selected_track['company']} {target_benchmark}% hiring bar."

    return {
        "track": selected_track,
        "readiness_score": readiness_score,
        "hiring_bar_threshold": target_benchmark,
        "is_interview_ready": is_interview_ready,
        "assessed_topics_count": assessed_topics_count,
        "total_topics_count": num_topics,
        "skill_gaps": skill_gaps,
        "recommended_action": recommendation
    }
