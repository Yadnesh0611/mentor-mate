import os
import io
import re
import logging
from typing import List, Dict, Any, Optional, Union
from PIL import Image, ImageEnhance, ImageOps, ImageStat, ImageFilter

try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

logger = logging.getLogger("document_extractor")

# Optional PDF engines
try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from pypdf import PdfReader
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

# Optional native Windows Media OCR
try:
    import winocr
    HAS_WINOCR = True
except ImportError:
    HAS_WINOCR = False

# Optional Tesseract OCR
try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

# Office formats
try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

try:
    import pptx
    HAS_PPTX = True
except ImportError:
    HAS_PPTX = False


class ExtractedSection:
    def __init__(
        self,
        content: str,
        page_number: Optional[int] = None,
        slide_number: Optional[int] = None,
        section_title: Optional[str] = None,
        is_ocr: bool = False
    ):
        self.content = content
        self.page_number = page_number
        self.slide_number = slide_number
        self.section_title = section_title
        self.is_ocr = is_ocr


class DocumentExtractor:
    @staticmethod
    def is_dark_background(img: Image.Image) -> bool:
        """
        Detects if an image has a dark background (blackboard, tablet dark mode, dark slides).
        """
        try:
            gray = img.convert("L")
            stat = ImageStat.Stat(gray)
            return stat.mean[0] < 125
        except Exception:
            return False

    @classmethod
    def preprocess_image_for_ocr(cls, img: Image.Image) -> Image.Image:
        """
        Enhances image resolution and contrast for optimal OCR accuracy.
        Auto-inverts dark mode / blackboard images to standard black-on-white.
        """
        try:
            # Convert RGBA/Palette images to RGB
            if img.mode in ("RGBA", "LA", "P"):
                rgb_img = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    rgb_img.paste(img, mask=img.split()[3])
                else:
                    rgb_img.paste(img.convert("RGB"))
                img = rgb_img
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Invert dark-mode / blackboard images so text becomes dark on light
            if cls.is_dark_background(img):
                img = ImageOps.invert(img)

            # Upscale small images (e.g. low-res scans or mobile snippets)
            w, h = img.size
            if w < 1000 or h < 1000:
                scale = max(1200 / max(w, 1), 1200 / max(h, 1))
                new_w, new_h = int(w * scale), int(h * scale)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Boost contrast slightly for clearer character definition
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.45)
        except Exception as e:
            logger.warning(f"Image preprocessing warning: {e}")

        return img

    @classmethod
    def preprocess_image_for_handwriting(cls, img: Image.Image) -> Image.Image:
        """
        Specialized filter for student handwriting, pencil notes, and physical paper:
        Auto-inverts if dark background, applies adaptive thresholding or Otsu binarization.
        """
        try:
            if img.mode != "RGB":
                img = img.convert("RGB")
            
            if cls.is_dark_background(img):
                img = ImageOps.invert(img)

            if HAS_CV2:
                gray = np.array(img.convert("L"))
                h, w = gray.shape
                if w < 1000 or h < 1000:
                    scale = max(1200 / max(w, 1), 1200 / max(h, 1))
                    gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)
                binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 11)
                return Image.fromarray(binary).convert("RGB")
            else:
                gray = img.convert("L")
                w, h = gray.size
                if w < 1000 or h < 1000:
                    scale = max(1200 / max(w, 1), 1200 / max(h, 1))
                    gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
                sharpened = gray.filter(ImageFilter.SHARPEN)
                contrast_boost = ImageEnhance.Contrast(sharpened).enhance(1.8)
                return contrast_boost.convert("RGB")
        except Exception as e:
            logger.warning(f"Handwriting preprocessing warning: {e}")
            return img

    @classmethod
    def ocr_image(cls, image_input: Union[str, bytes, Image.Image], lang: str = "en") -> str:
        """
        Extracts textual content from an image using multi-pass OCR engines:
        1. Native Windows Media OCR with standard contrast
        2. Multi-pass with specialized handwriting sharpening
        3. Tesseract OCR fallback
        """
        img: Optional[Image.Image] = None
        try:
            if isinstance(image_input, str):
                img = Image.open(image_input)
            elif isinstance(image_input, bytes):
                img = Image.open(io.BytesIO(image_input))
            elif isinstance(image_input, Image.Image):
                img = image_input
            else:
                return ""
        except Exception as e:
            logger.error(f"Failed to open image for OCR: {e}")
            return ""

        extracted_text = ""

        # Pass 1: Standard high-contrast preprocessed image
        processed_img = cls.preprocess_image_for_ocr(img)

        # Tier 1: Windows Native Media OCR
        if HAS_WINOCR:
            try:
                import asyncio
                import concurrent.futures

                try:
                    running_loop = asyncio.get_running_loop()
                except RuntimeError:
                    running_loop = None

                def _run_winocr(target_img):
                    if running_loop is not None and running_loop.is_running():
                        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                            fut = pool.submit(winocr.recognize_pil_sync, target_img, lang)
                            return fut.result(timeout=15.0)
                    else:
                        return winocr.recognize_pil_sync(target_img, lang)

                res = _run_winocr(processed_img)
                if isinstance(res, dict) and res.get("text"):
                    extracted_text = res["text"].strip()
                elif hasattr(res, "text") and getattr(res, "text"):
                    extracted_text = str(getattr(res, "text")).strip()

                # Pass 2: If sparse or empty, run handwriting enhancement pass
                if len(extracted_text.split()) < 10:
                    hw_img = cls.preprocess_image_for_handwriting(img)
                    hw_res = _run_winocr(hw_img)
                    hw_text = ""
                    if isinstance(hw_res, dict) and hw_res.get("text"):
                        hw_text = hw_res["text"].strip()
                    elif hasattr(hw_res, "text") and getattr(hw_res, "text"):
                        hw_text = str(getattr(hw_res, "text")).strip()
                    
                    if len(hw_text.split()) > len(extracted_text.split()):
                        extracted_text = hw_text

            except Exception as e:
                logger.warning(f"winocr extraction failed: {e}")

        # Tier 2: Tesseract OCR fallback
        if not extracted_text and HAS_TESSERACT:
            try:
                tess_text = pytesseract.image_to_string(processed_img, lang=lang)
                if tess_text and tess_text.strip():
                    extracted_text = tess_text.strip()
                else:
                    hw_img = cls.preprocess_image_for_handwriting(img)
                    tess_hw = pytesseract.image_to_string(hw_img, lang=lang)
                    if tess_hw and tess_hw.strip():
                        extracted_text = tess_hw.strip()
            except Exception as e:
                logger.debug(f"pytesseract fallback unavailable: {e}")

        # Clean whitespace and normalize linebreaks
        if extracted_text:
            cleaned = re.sub(r"[ \t]+", " ", extracted_text)
            cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
            return cleaned.strip()

        return ""


    @classmethod
    async def extract_pdf_async(cls, file_path: str) -> List[ExtractedSection]:
        sections: List[ExtractedSection] = []

        # Primary PDF engine: PyMuPDF (supports rasterization + digital text)
        if HAS_PYMUPDF:
            try:
                doc = pymupdf.open(file_path)
                for i, page in enumerate(doc):
                    page_num = i + 1
                    raw_text = page.get_text().strip()

                    # Check if page has digital text
                    if len(raw_text) >= 40:
                        sections.append(ExtractedSection(
                            content=raw_text,
                            page_number=page_num,
                            section_title=f"Page {page_num}"
                        ))
                    else:
                        # Scanned or handwritten PDF page! Render to pixmap and perform OCR
                        try:
                            pix = page.get_pixmap(dpi=150)
                            pil_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                            ocr_text = cls.ocr_image(pil_img)
                            words = [w for w in ocr_text.split() if len(w) > 1]
                            avg_word_len = sum(len(w) for w in words) / max(1, len(words))

                            # If local OCR produced abundant high quality text (> 35 words), use it
                            if len(words) >= 35 and 3.0 <= avg_word_len <= 10.0:
                                sections.append(ExtractedSection(
                                    content=ocr_text,
                                    page_number=page_num,
                                    section_title=f"Page {page_num} (OCR Scanned)",
                                    is_ocr=True
                                ))
                            else:
                                # For student handwriting or sparse/noisy OCR, use Multimodal Vision
                                vision_text = await cls.transcribe_image_vision(pil_img)
                                if vision_text and len(vision_text.split()) >= 6:
                                    lines = [line.strip("#*- \t") for line in vision_text.splitlines() if line.strip("#*- \t")]
                                    sub_title = f": {lines[0]}" if lines and len(lines[0]) < 60 else ""
                                    sections.append(ExtractedSection(
                                        content=vision_text.strip(),
                                        page_number=page_num,
                                        section_title=f"Page {page_num} (OCR Scanned){sub_title}",
                                        is_ocr=True
                                    ))
                                elif ocr_text:
                                    sections.append(ExtractedSection(
                                        content=ocr_text,
                                        page_number=page_num,
                                        section_title=f"Page {page_num} (OCR Scanned)",
                                        is_ocr=True
                                    ))
                                elif raw_text:
                                    sections.append(ExtractedSection(
                                        content=raw_text,
                                        page_number=page_num,
                                        section_title=f"Page {page_num}"
                                    ))
                        except Exception as e:
                            logger.warning(f"OCR rasterization failed on PDF page {page_num}: {e}")
                            if raw_text:
                                sections.append(ExtractedSection(
                                    content=raw_text,
                                    page_number=page_num,
                                    section_title=f"Page {page_num}"
                                ))
                doc.close()
                if sections:
                    return sections
            except Exception as e:
                logger.warning(f"PyMuPDF extraction encountered error: {e}, falling back to pypdf")

        # Fallback PDF engine: pypdf
        if HAS_PYPDF:
            try:
                reader = PdfReader(file_path)
                for i, page in enumerate(reader.pages):
                    page_num = i + 1
                    text = (page.extract_text() or "").strip()
                    if len(text) >= 40:
                        sections.append(ExtractedSection(
                            content=text,
                            page_number=page_num,
                            section_title=f"Page {page_num}"
                        ))
                    else:
                        # Attempt embedded image OCR
                        ocr_parts = []
                        if hasattr(page, "images"):
                            for img_file in page.images:
                                ocr_part = cls.ocr_image(img_file.data)
                                if ocr_part:
                                    ocr_parts.append(ocr_part)
                        if ocr_parts:
                            sections.append(ExtractedSection(
                                content="\n\n".join(ocr_parts),
                                page_number=page_num,
                                section_title=f"Page {page_num} (Embedded OCR)",
                                is_ocr=True
                            ))
                        elif text:
                            sections.append(ExtractedSection(
                                content=text,
                                page_number=page_num,
                                section_title=f"Page {page_num}"
                            ))
                return sections
            except Exception as e:
                logger.error(f"pypdf extraction failed: {e}")

        return sections

    @classmethod
    def extract_pdf(cls, file_path: str) -> List[ExtractedSection]:
        import asyncio
        import concurrent.futures
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(lambda: asyncio.run(cls.extract_pdf_async(file_path)))
                return future.result(timeout=120.0)
        else:
            return asyncio.run(cls.extract_pdf_async(file_path))

    @classmethod
    async def transcribe_image_vision(cls, image_input: Union[str, bytes, Image.Image]) -> Optional[str]:
        """
        Multimodal LLM fallback to transcribe complex student handwriting, math formulas, and diagrams.
        """
        try:
            import base64
            from app.services.ai_service import ai_service
            buf = io.BytesIO()
            if isinstance(image_input, str):
                with Image.open(image_input) as img:
                    img.convert("RGB").save(buf, format="JPEG", quality=90)
            elif isinstance(image_input, bytes):
                with Image.open(io.BytesIO(image_input)) as img:
                    img.convert("RGB").save(buf, format="JPEG", quality=90)
            elif isinstance(image_input, Image.Image):
                image_input.convert("RGB").save(buf, format="JPEG", quality=90)
            else:
                return None

            b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")
            res = await ai_service.transcribe_image(b64_data, "image/jpeg")
            if res and res.strip():
                return res.strip()
        except Exception as e:
            logger.info(f"Multimodal vision transcription skipped/unavailable: {e}")
        return None

    @staticmethod
    def parse_markdown_into_sections(markdown_text: str, filename: str) -> List[ExtractedSection]:
        """
        Parses multimodal vision transcription markdown into structured semantic sections.
        """
        sections: List[ExtractedSection] = []
        raw_chunks = re.split(r'\n(?=#{1,3}\s+)', markdown_text.strip())
        for chunk in raw_chunks:
            chunk_clean = chunk.strip()
            if not chunk_clean:
                continue
            lines = [line.strip() for line in chunk_clean.splitlines() if line.strip()]
            if not lines:
                continue
            first_line = lines[0].strip("#- \t*")
            first_line_clean = re.sub(r"^[^\w\s]+", "", first_line).strip()
            title = first_line_clean if first_line_clean and len(first_line_clean) < 80 else f"Section: {filename}"
            sections.append(ExtractedSection(
                content=chunk_clean,
                section_title=title,
                is_ocr=True
            ))
        if not sections and markdown_text.strip():
            sections.append(ExtractedSection(
                content=markdown_text.strip(),
                section_title=f"Transcribed Notes: {filename}",
                is_ocr=True
            ))
        return sections

    @classmethod
    async def extract_image_async(cls, file_path: str) -> List[ExtractedSection]:
        """
        Comprehensive Multi-Tier Image OCR Pipeline:
        1. Fast local OCR with dark-mode inversion and adaptive thresholding
        2. Multimodal LLM Vision for handwriting, blackboards, diagrams, and math formulas
        """
        filename = os.path.basename(file_path)
        try:
            with Image.open(file_path) as img:
                w, h = img.size

            # Fast local OCR pass
            ocr_text = cls.ocr_image(file_path)
            words = ocr_text.split()
            
            # If local OCR produced abundant, high-quality text (> 40 words), check if vision is needed
            if len(words) >= 40:
                avg_word_len = sum(len(w) for w in words) / max(1, len(words))
                if 3.0 <= avg_word_len <= 10.0:
                    return [ExtractedSection(
                        content=ocr_text,
                        section_title=f"Extracted Notes: {filename}",
                        is_ocr=True
                    )]

            # For student notes, blackboards, handwriting, or when local OCR is sparse/noisy:
            vision_text = await cls.transcribe_image_vision(file_path)
            if vision_text and len(vision_text.split()) >= 10:
                sections = cls.parse_markdown_into_sections(vision_text, filename)
                if sections:
                    logger.info(f"[OCR] Successfully extracted {len(sections)} structured sections via Multimodal Vision for '{filename}'")
                    return sections

            if ocr_text and len(ocr_text.split()) >= 5:
                return [ExtractedSection(
                    content=ocr_text,
                    section_title=f"Extracted Notes: {filename}",
                    is_ocr=True
                )]

            return [ExtractedSection(
                content=f"[Visual Artifact / Diagram: {filename} ({w}x{h}) - No legible text detected. Use 'Verify & Edit' to add notes or formulas.]",
                section_title=f"Visual Notes: {filename}",
                is_ocr=True
            )]
        except Exception as e:
            logger.error(f"Failed to process image: {e}")
            raise ValueError(f"Failed to process image: {e}")

    @classmethod
    def extract_image(cls, file_path: str) -> List[ExtractedSection]:
        """
        Synchronous wrapper calling the multi-tier async pipeline.
        """
        import asyncio
        import concurrent.futures
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(lambda: asyncio.run(cls.extract_image_async(file_path)))
                return future.result(timeout=45.0)
        else:
            return asyncio.run(cls.extract_image_async(file_path))

    @staticmethod
    def extract_docx(file_path: str) -> List[ExtractedSection]:
        if not HAS_DOCX:
            raise ValueError("docx library not installed")
        sections = []
        doc = docx.Document(file_path)
        current_heading = "Document Overview"
        current_lines = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            if p.style.name.startswith("Heading"):
                if current_lines:
                    sections.append(ExtractedSection(
                        content="\n".join(current_lines),
                        section_title=current_heading
                    ))
                    current_lines = []
                current_heading = text
            else:
                current_lines.append(text)

        if current_lines:
            sections.append(ExtractedSection(
                content="\n".join(current_lines),
                section_title=current_heading
            ))
        return sections

    @staticmethod
    def extract_pptx(file_path: str) -> List[ExtractedSection]:
        if not HAS_PPTX:
            raise ValueError("pptx library not installed")
        sections = []
        prs = pptx.Presentation(file_path)
        for i, slide in enumerate(prs.slides):
            slide_texts = []
            slide_title = f"Slide {i + 1}"
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    if hasattr(shape, "has_text_frame") and shape.has_text_frame:
                        if shape == slide.shapes[0] and len(shape.text.strip()) < 80:
                            slide_title = shape.text.strip()
                    slide_texts.append(shape.text.strip())
            if slide_texts:
                sections.append(ExtractedSection(
                    content="\n".join(slide_texts),
                    slide_number=i + 1,
                    section_title=slide_title
                ))
        return sections

    @staticmethod
    def extract_txt(file_path: str) -> List[ExtractedSection]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read().strip()
        if not text:
            return []
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        return [
            ExtractedSection(content=p, section_title=f"Section {i + 1}")
            for i, p in enumerate(paragraphs)
        ]

    @classmethod
    async def extract_async(cls, file_path: str, file_type: str) -> List[ExtractedSection]:
        ext = file_type.lower().replace(".", "")
        if ext == "pdf":
            return await cls.extract_pdf_async(file_path)
        elif ext in ["docx", "doc"]:
            return cls.extract_docx(file_path)
        elif ext in ["pptx", "ppt"]:
            return cls.extract_pptx(file_path)
        elif ext in ["txt", "md", "markdown"]:
            return cls.extract_txt(file_path)
        elif ext in ["png", "jpg", "jpeg", "webp", "bmp", "tiff"]:
            return await cls.extract_image_async(file_path)
        else:
            raise ValueError(f"Unsupported document format: {file_type}")

    @classmethod
    def extract(cls, file_path: str, file_type: str) -> List[ExtractedSection]:
        ext = file_type.lower().replace(".", "")
        if ext == "pdf":
            return cls.extract_pdf(file_path)
        elif ext in ["docx", "doc"]:
            return cls.extract_docx(file_path)
        elif ext in ["pptx", "ppt"]:
            return cls.extract_pptx(file_path)
        elif ext in ["txt", "md", "markdown"]:
            return cls.extract_txt(file_path)
        elif ext in ["png", "jpg", "jpeg", "webp", "bmp", "tiff"]:
            return cls.extract_image(file_path)
        else:
            raise ValueError(f"Unsupported document format: {file_type}")


document_extractor = DocumentExtractor()

