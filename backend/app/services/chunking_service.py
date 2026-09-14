import re
from typing import List, Optional
from app.services.extraction_service import ExtractedSection

class Chunk:
    def __init__(
        self,
        content: str,
        chunk_index: int,
        page_number: Optional[int] = None,
        slide_number: Optional[int] = None,
        section_title: Optional[str] = None
    ):
        self.content = content
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.slide_number = slide_number
        self.section_title = section_title
        self.token_estimate = len(content.split())

class ChunkingService:
    def __init__(self, target_chunk_words: int = 350, overlap_words: int = 40):
        self.target_chunk_words = target_chunk_words
        self.overlap_words = overlap_words

    def chunk_sections(self, sections: List[ExtractedSection]) -> List[Chunk]:
        chunks: List[Chunk] = []
        global_idx = 0

        for sec in sections:
            words = sec.content.split()
            if len(words) <= self.target_chunk_words:
                chunks.append(Chunk(
                    content=sec.content,
                    chunk_index=global_idx,
                    page_number=sec.page_number,
                    slide_number=sec.slide_number,
                    section_title=sec.section_title
                ))
                global_idx += 1
            else:
                # Sliding window chunking with word boundary preservation
                step = self.target_chunk_words - self.overlap_words
                for start_idx in range(0, len(words), step):
                    chunk_words = words[start_idx : start_idx + self.target_chunk_words]
                    if not chunk_words:
                        break
                    chunk_text = ' '.join(chunk_words)
                    chunks.append(Chunk(
                        content=chunk_text,
                        chunk_index=global_idx,
                        page_number=sec.page_number,
                        slide_number=sec.slide_number,
                        section_title=sec.section_title
                    ))
                    global_idx += 1
                    if start_idx + self.target_chunk_words >= len(words):
                        break

        return chunks

chunking_service = ChunkingService()
