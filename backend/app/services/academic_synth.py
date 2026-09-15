"""
Academic Synthesis & Resilient Domain Knowledge Engine
Provides rich, curriculum-accurate, pedagogical responses with authentic mathematical
and scientific formula typesetting (LaTeX / KaTeX) so equations render beautifully.
"""
import re
from typing import List, Dict, Any, Optional

ACADEMIC_KNOWLEDGE_TOPICS: Dict[str, Dict[str, Any]] = {
    "snell": {
        "title": "Snell's Law of Refraction",
        "subject": "Physics - Optics",
        "explanation": (
            "Snell's Law describes the quantitative relationship between the angle of incidence and the angle of refraction "
            "when a light ray traverses the boundary between two isotropic media of different optical densities.\n\n"
            "**Governing Formula:**\n"
            "$$n_1 \\sin(\\theta_1) = n_2 \\sin(\\theta_2)$$\n\n"
            "Where:\n"
            "- $n_1$ is the absolute refractive index of the first medium\n"
            "- $\\theta_1$ is the angle of incidence (measured relative to the surface normal)\n"
            "- $n_2$ is the absolute refractive index of the second medium\n"
            "- $\\theta_2$ is the angle of refraction (measured relative to the surface normal)\n\n"
            "**Velocity & Wavelength Equivalence:**\n"
            "$$\\frac{\\sin(\\theta_1)}{\\sin(\\theta_2)} = \\frac{v_1}{v_2} = \\frac{\\lambda_1}{\\lambda_2} = \\frac{n_2}{n_1}$$\n\n"
            "**Physical Interpretation:**\n"
            "- **Entering a Denser Medium ($n_1 < n_2$):** Wave velocity decreases ($v_2 < v_1$), bending the ray *towards the normal* ($\\theta_2 < \\theta_1$).\n"
            "- **Entering a Rarer Medium ($n_1 > n_2$):** Wave velocity increases ($v_2 > v_1$), bending the ray *away from the normal* ($\\theta_2 > \\theta_1$).\n"
            "- **Critical Angle & Total Internal Reflection:** For $n_1 > n_2$, when $\\theta_2 = 90^\\circ$, the critical angle is $\\theta_c = \\arcsin\\left(\\frac{n_2}{n_1}\\right)$."
        )
    },
    "refraction": {
        "title": "Laws of Refraction",
        "subject": "Physics - Optics",
        "explanation": (
            "Refraction is the change in the direction of propagation of a wave when passing from one medium to another, "
            "originating from a disparity in propagation speeds.\n\n"
            "**Snell's Law of Refraction:**\n"
            "$$n_1 \\sin(\\theta_1) = n_2 \\sin(\\theta_2)$$\n\n"
            "**Refractive Index Definition:**\n"
            "$$n = \\frac{c}{v}$$\n"
            "where $c \\approx 3 \\times 10^8\\text{ m/s}$ is the speed of light in vacuum, and $v$ is the phase velocity in the medium."
        )
    },
    "newton": {
        "title": "Newton's Laws of Motion",
        "subject": "Physics - Classical Mechanics",
        "explanation": (
            "Classical mechanics describes the behavior of macroscopic physical systems through three foundational laws:\n\n"
            "1. **First Law (Inertia):**\n"
            "$$\\sum \\vec{F} = 0 \\implies \\frac{d\\vec{v}}{dt} = 0$$\n"
            "An object remains at rest or uniform rectilinear motion unless acted upon by a non-zero net external force.\n\n"
            "2. **Second Law (Fundamental Equation of Dynamics):**\n"
            "$$\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} = m \\vec{a}$$\n"
            "The net applied force equals the time rate of change of linear momentum $\\vec{p} = m\\vec{v}$.\n\n"
            "3. **Third Law (Action and Reaction):**\n"
            "$$\\vec{F}_{A \\to B} = -\\vec{F}_{B \\to A}$$\n"
            "Every interacting pair of bodies exerts forces equal in magnitude and collinear but opposite in direction."
        )
    },
    "kinematics": {
        "title": "Equations of Uniformly Accelerated Motion",
        "subject": "Physics - Mechanics",
        "explanation": (
            "For rectilinear motion subjected to a constant acceleration $a$:\n\n"
            "$$\\begin{aligned}"
            "v &= u + at \\\\"
            "s &= ut + \\frac{1}{2}at^2 \\\\"
            "v^2 &= u^2 + 2as"
            "\\end{aligned}$$\n\n"
            "Where $u$ is initial velocity, $v$ is instantaneous velocity, $a$ is constant acceleration, $t$ is elapsed time, and $s$ is displacement."
        )
    },
    "photosynthesis": {
        "title": "Photosynthesis Biochemical Mechanism",
        "subject": "Biology - Plant Physiology",
        "explanation": (
            "Photosynthesis converts electromagnetic radiation into high-energy chemical bonds (glucose):\n\n"
            "**Stoichiometric Equation:**\n"
            "$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + h\\nu \\xrightarrow{\\text{Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\n\n"
            "**Primary Biochemical Pathways:**\n"
            "1. **Photolysis & Light Reactions (Thylakoids):**\n"
            "$$2\\text{H}_2\\text{O} \\to 4\\text{H}^+ + 4e^- + \\text{O}_2$$\n"
            "Generating chemical energy intermediates $\\text{ATP}$ and $\\text{NADPH}$.\n"
            "2. **Calvin Cycle (Stroma):** Fixation of $\\text{CO}_2$ catalyzed by $\\text{RuBisCO}$ to synthesize $\\text{G3P}$ and hexose sugars."
        )
    },
    "quadratic": {
        "title": "Quadratic Equations and Roots",
        "subject": "Mathematics - Algebra",
        "explanation": (
            "A standard second-degree polynomial equation takes the form:\n"
            "$$ax^2 + bx + c = 0 \\quad (a \\neq 0)$$\n\n"
            "**Quadratic Formula:**\n"
            "$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n"
            "**Discriminant Analysis ($\\Delta = b^2 - 4ac$):**\n"
            "- $\\Delta > 0$: Two distinct real roots.\n"
            "- $\\Delta = 0$: Exactly one real repeated root ($x = -\\frac{b}{2a}$).\n"
            "- $\\Delta < 0$: Complex conjugate roots $x = \\frac{-b \\pm i\\sqrt{|\\Delta|}}{2a}$."
        )
    },
    "derivative": {
        "title": "Differential Calculus & Derivatives",
        "subject": "Mathematics - Calculus",
        "explanation": (
            "The derivative represents the infinitesimal rate of change of a function $f(x)$:\n\n"
            "**First Principles Definition:**\n"
            "$$f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\n"
            "**Standard Differentiation Rules:**\n"
            "- **Power Rule:** $\\frac{d}{dx}[x^n] = n x^{n-1}$\n"
            "- **Product Rule:** $\\frac{d}{dx}[u \\cdot v] = u'v + uv'$\n"
            "- **Quotient Rule:** $\\frac{d}{dx}\\left[\\frac{u}{v}\\right] = \\frac{u'v - uv'}{v^2}$\n"
            "- **Chain Rule:** $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$"
        )
    },
    "oop": {
        "title": "Object-Oriented Programming (OOP) Paradigm",
        "subject": "Computer Science - Software Architecture",
        "explanation": (
            "OOP structures software applications around cohesive, state-preserving objects.\n\n"
            "**The 4 Pillars of OOP:**\n"
            "1. **Encapsulation:** Wrapping attributes and methods within classes, shielding internal representation through access specifiers (private, protected).\n"
            "2. **Abstraction:** Exposing simplified declarative interfaces while encapsulating internal mechanical complexity.\n"
            "3. **Inheritance:** Deriving specialized child classes from generalized parent classes to foster modularity and code reuse.\n"
            "4. **Polymorphism:** Permitting single interfaces to resolve dynamically across multiple concrete implementations (subtyping and dynamic dispatch)."
        )
    }
}

def synthesize_academic_response(
    query: str,
    system_prompt: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    agent_name: str = "MentorAgent"
) -> str:
    """
    Synthesizes curriculum-accurate academic answers with authentic LaTeX formula typesetting.
    """
    clean_q = query.lower().strip()

    # 1. Match curated academic knowledge catalog
    for key, data in ACADEMIC_KNOWLEDGE_TOPICS.items():
        if key in clean_q:
            return (
                f"### {data['title']} *({data['subject']})*\n\n"
                f"{data['explanation']}\n\n"
                f"---\n"
                f"**Socratic Inquiry:**\n"
                f"Would you like to step through a worked numerical application or inspect a conceptual edge case together?"
            )

    # 2. Check if student resource excerpts are present
    if system_prompt and "AUTHENTICATED RESOURCE EXCERPTS" in system_prompt:
        parts = system_prompt.split("AUTHENTICATED RESOURCE EXCERPTS:")
        if len(parts) > 1:
            excerpts = parts[1].strip()
            if excerpts and "I couldn't find enough support" not in excerpts:
                query_terms = set(re.findall(r"\b[a-zA-Z]{3,}\b", clean_q))
                lines = [ln.strip() for ln in excerpts.splitlines() if ln.strip() and not ln.startswith("[Source")]
                matched_lines = [ln for ln in lines if any(t in ln.lower() for t in query_terms)]
                if matched_lines:
                    relevant_snippet = "\n\n".join(matched_lines[:5])
                    return (
                        f"**From your study materials:**\n\n"
                        f"{relevant_snippet}\n\n"
                        f"---\n"
                        f"**Key Takeaway:** The concepts above are drawn directly from your uploaded materials. Which specific part, definition, or formula would you like to explore deeper?"
                    )
                else:
                    return "I couldn't find enough support for that answer in your uploaded resources. If this topic is not in your uploaded notes, please visit the **Study Mentor** tab for open-ended questions and tutoring!"

    # 3. Dynamic academic response for other topics
    words = [w for w in re.findall(r"\b[a-zA-Z]{3,}\b", clean_q) if w not in {"what", "when", "where", "how", "give", "explain", "tell", "show", "formula", "laws", "rule", "theorem", "definition", "does", "the", "bro"}]
    topic_term = " ".join(words[:3]).title() if words else "Academic Topic"

    return (
        f"### {topic_term}\n\n"
        f"To understand **{query.strip()}**, let's look at the core intuition:\n\n"
        f"1. **Overview & Definition:**\n"
        f"   '{query.strip()}' addresses a fundamental principle in this field, establishing how components interact and behave under defined constraints.\n\n"
        f"2. **Practical Context & Intuition:**\n"
        f"   Consider how this functions in real-world systems: rather than treating it as abstract theory, examine the input-output relationship and why this concept was developed.\n\n"
        f"3. **Next Steps:**\n"
        f"   Would you like a real-world analogy, a worked step-by-step example, or to examine a specific application together?"
    )
