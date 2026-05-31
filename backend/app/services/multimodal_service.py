"""
Multi-modal AI Service
Handles audio, video, and combined media processing
Supports transcription, frame extraction, and multi-modal analysis
"""

import os
import uuid
import base64
import subprocess
from typing import Dict, Optional, List, Tuple
from io import BytesIO
import tempfile
from pathlib import Path

# Audio/Video processing
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

try:
    from moviepy import VideoFileClip
    MOVIEPY_AVAILABLE = True
except ImportError:
    try:
        # Fallback for older MoviePy versions
        from moviepy.editor import VideoFileClip
        MOVIEPY_AVAILABLE = True
    except ImportError:
        MOVIEPY_AVAILABLE = False

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

# LLM for analysis
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class MultimodalService:
    """Service for multi-modal AI processing (audio, video, combined)"""
    
    def __init__(self):
        # Initialize Whisper model for transcription (lazy load)
        self.whisper_model = None
        self.whisper_available = WHISPER_AVAILABLE
        
        # Check FFmpeg availability for Whisper
        self._check_ffmpeg()
        
        # Initialize LLM for analysis
        self.llm = self._initialize_llm()
    
    def _check_ffmpeg(self):
        """Check if FFmpeg is available in PATH"""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print("[INFO] FFmpeg detected and available")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            print(f"[WARNING] FFmpeg check failed: {str(e)}")
            print("[WARNING] Whisper requires FFmpeg. Please ensure FFmpeg is installed and in PATH.")
        return False
    
    def _initialize_llm(self):
        """Initialize LLM for multi-modal analysis"""
        # Try Gemini first (supports multi-modal)
        google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if google_api_key and GEMINI_AVAILABLE:
            try:
                model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
                return ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=google_api_key,
                    temperature=0.7
                )
            except Exception as e:
                print(f"[WARNING] Failed to initialize Gemini: {str(e)}")
        
        # Try OpenAI
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key and OPENAI_AVAILABLE:
            try:
                return OpenAI(api_key=openai_api_key)
            except Exception:
                pass
        
        return None
    
    def _load_whisper_model(self):
        """Lazy load Whisper model"""
        # Re-check if Whisper is available (in case it was installed after server start)
        if not self.whisper_available:
            try:
                import whisper
                self.whisper_available = True
                print("[INFO] Whisper detected")
            except ImportError:
                return None
        
        if self.whisper_model is None:
            try:
                # Use base model for faster processing (can be upgraded to medium/large)
                print("[INFO] Loading Whisper model (this may take a minute on first use)...")
                self.whisper_model = whisper.load_model("base")
                print("[INFO] Whisper model loaded successfully")
            except Exception as e:
                error_msg = str(e)
                print(f"[ERROR] Failed to load Whisper model: {error_msg}")
                # Check for common issues
                if "ffmpeg" in error_msg.lower() or "ffprobe" in error_msg.lower():
                    print("[ERROR] FFmpeg not found. Please install FFmpeg and add it to PATH.")
                elif "model" in error_msg.lower() and ("not found" in error_msg.lower() or "download" in error_msg.lower()):
                    print("[ERROR] Whisper model download failed. Check your internet connection.")
                self.whisper_available = False
                return None
        
        return self.whisper_model
    
    async def transcribe_audio(self, audio_content: bytes, filename: str) -> Dict[str, any]:
        """
        Transcribe audio to text using Whisper
        
        Args:
            audio_content: Audio file bytes
            filename: Original filename
        
        Returns:
            Dictionary with transcription and metadata
        """
        # Re-check Whisper availability just before transcription
        if not self.whisper_available:
            # Attempt to load model if it wasn't available at init
            self._load_whisper_model()
            if not self.whisper_available:  # Still not available after attempt
                return {
                    "error": "Whisper not available. Please install: pip install openai-whisper. Also ensure FFmpeg is installed on your system.",
                    "success": False
                }
        
        try:
            model = self._load_whisper_model()
            if not model:
                return {
                    "error": "Failed to load Whisper model. Make sure FFmpeg is installed on your system.",
                    "success": False
                }
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
                tmp_file.write(audio_content)
                tmp_path = tmp_file.name
            
            try:
                # Verify FFmpeg is accessible before transcription
                # Whisper uses FFmpeg internally to process audio files
                try:
                    ffmpeg_check = subprocess.run(
                        ["ffmpeg", "-version"],
                        capture_output=True,
                        text=True,
                        timeout=3
                    )
                    if ffmpeg_check.returncode != 0:
                        raise FileNotFoundError("FFmpeg not found")
                except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError) as e:
                    print(f"[ERROR] FFmpeg check failed: {str(e)}")
                    raise RuntimeError("FFmpeg is required for audio transcription but was not found. Please ensure FFmpeg is installed and in your system PATH.")
                
                # Transcribe (use fp16=False for compatibility)
                result = model.transcribe(tmp_path, fp16=False)
                
                # Get transcription text (strip whitespace)
                text = result.get("text", "").strip()
                
                # Calculate duration from segments, or use the last segment's end time
                segments = result.get("segments", [])
                if segments:
                    duration = sum(seg.get("end", 0) - seg.get("start", 0) for seg in segments)
                    # Fallback: use last segment end time if sum is 0
                    if duration == 0 and segments:
                        duration = segments[-1].get("end", 0)
                else:
                    # If no segments, try to get duration from file metadata
                    try:
                        probe_result = subprocess.run(
                            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", tmp_path],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        if probe_result.returncode == 0:
                            duration = float(probe_result.stdout.strip())
                        else:
                            duration = 0
                    except:
                        duration = 0
                
                # Warn if text is empty
                if not text:
                    print("[WARNING] Transcription returned empty text. The audio might be silent or too short.")
                
                return {
                    "success": True,
                    "text": text if text else "(No speech detected in audio)",
                    "language": result.get("language", "unknown"),
                    "segments": segments,
                    "duration": duration
                }
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass
        
        except Exception as e:
            error_msg = str(e)
            import traceback
            traceback_str = traceback.format_exc()
            print(f"[ERROR] Transcription error: {error_msg}")
            print(f"[ERROR] Full traceback:\n{traceback_str}")
            
            # Provide helpful error messages
            if "ffmpeg" in error_msg.lower() or "ffprobe" in error_msg.lower():
                # Check if FFmpeg is actually available
                try:
                    ffmpeg_check = subprocess.run(
                        ["ffmpeg", "-version"],
                        capture_output=True,
                        text=True,
                        timeout=3
                    )
                    if ffmpeg_check.returncode == 0:
                        error_msg = "FFmpeg is installed but Whisper cannot access it. This may be a PATH issue. Try restarting your backend server after ensuring FFmpeg is in your system PATH."
                    else:
                        error_msg = "FFmpeg is not installed or not in PATH. Please install FFmpeg: https://ffmpeg.org/download.html. After installation, restart your terminal and backend server."
                except:
                    error_msg = "FFmpeg is not installed or not in PATH. Please install FFmpeg: https://ffmpeg.org/download.html. After installation, restart your terminal and backend server."
            elif "model" in error_msg.lower() and ("not found" in error_msg.lower() or "download" in error_msg.lower()):
                error_msg = "Whisper model download failed. Please check your internet connection. The model will be downloaded automatically on first use."
            elif "cuda" in error_msg.lower() or "gpu" in error_msg.lower():
                error_msg = "GPU/CUDA error. Try using CPU mode or check your GPU drivers."
            elif "permission" in error_msg.lower() or "access" in error_msg.lower():
                error_msg = "Permission error accessing temporary file. Please check file permissions."
            elif "memory" in error_msg.lower() or "out of memory" in error_msg.lower():
                error_msg = "Out of memory error. Try using a smaller audio file or a smaller Whisper model."
            
            return {
                "error": f"Transcription failed: {error_msg}",
                "success": False,
                "details": str(e),
                "traceback": traceback_str if os.getenv("DEBUG", "false").lower() == "true" else None
            }
    
    async def extract_video_audio(self, video_content: bytes, filename: str) -> Dict[str, any]:
        """
        Extract audio from video file
        
        Args:
            video_content: Video file bytes
            filename: Original filename
        
        Returns:
            Dictionary with audio data and metadata
        """
        # Re-check MoviePy availability at runtime (in case it was installed after server start)
        moviepy_available = MOVIEPY_AVAILABLE
        VideoFileClip = None
        if not moviepy_available:
            try:
                from moviepy import VideoFileClip
                moviepy_available = True
                print("[INFO] MoviePy detected at runtime")
            except ImportError:
                try:
                    from moviepy.editor import VideoFileClip
                    moviepy_available = True
                    print("[INFO] MoviePy (legacy) detected at runtime")
                except ImportError:
                    pass
        
        if not moviepy_available:
            print("[ERROR] MoviePy not available. Please install: pip install moviepy and restart the server")
            return {
                "error": "MoviePy not available. Please install: pip install moviepy and restart the server",
                "success": False
            }
        
        try:
            if VideoFileClip is None:
                from moviepy import VideoFileClip
            print(f"[INFO] Extracting audio from video file: {filename}")
            # Save video to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
                tmp_file.write(video_content)
                tmp_path = tmp_file.name
            
            try:
                # Extract audio
                video = VideoFileClip(tmp_path)
                audio = video.audio
                
                if audio is None:
                    return {
                        "error": "No audio track found in video",
                        "success": False
                    }
                
                # Save audio to temp file
                audio_path = tmp_path.replace(Path(tmp_path).suffix, ".wav")
                audio.write_audiofile(audio_path, verbose=False, logger=None)
                
                # Read audio bytes
                with open(audio_path, "rb") as f:
                    audio_bytes = f.read()
                
                # Clean up
                audio.close()
                video.close()
                
                return {
                    "success": True,
                    "audio_bytes": audio_bytes,
                    "duration": video.duration,
                    "fps": video.fps,
                    "size": video.size
                }
            finally:
                # Clean up temp files
                for path in [tmp_path, audio_path]:
                    if os.path.exists(path):
                        try:
                            os.unlink(path)
                        except:
                            pass
        
        except Exception as e:
            return {
                "error": f"Audio extraction failed: {str(e)}",
                "success": False
            }
    
    async def extract_video_frames(self, video_content: bytes, filename: str, num_frames: int = 10) -> Dict[str, any]:
        """
        Extract frames from video
        
        Args:
            video_content: Video file bytes
            filename: Original filename
            num_frames: Number of frames to extract
        
        Returns:
            Dictionary with frames and metadata
        """
        if not OPENCV_AVAILABLE:
            print("[ERROR] OpenCV not available. Please install: pip install opencv-python")
            return {
                "error": "OpenCV not available. Please install: pip install opencv-python",
                "success": False
            }
        
        try:
            import cv2
            import base64
            print(f"[INFO] Extracting {num_frames} frames from video file: {filename}")
            
            # Save video to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_file:
                tmp_file.write(video_content)
                tmp_path = tmp_file.name
            
            try:
                # Open video
                cap = cv2.VideoCapture(tmp_path)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                duration = total_frames / fps if fps > 0 else 0
                
                # Calculate frame indices to extract
                frame_indices = [int(i * total_frames / (num_frames + 1)) for i in range(1, num_frames + 1)]
                
                frames = []
                frame_count = 0
                
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                    
                    if frame_count in frame_indices:
                        # Encode frame as base64
                        _, buffer = cv2.imencode('.jpg', frame)
                        frame_base64 = base64.b64encode(buffer).decode('utf-8')
                        
                        frames.append({
                            "frame_number": frame_count,
                            "timestamp": frame_count / fps if fps > 0 else 0,
                            "image_base64": f"data:image/jpeg;base64,{frame_base64}"
                        })
                    
                    frame_count += 1
                
                cap.release()
                
                return {
                    "success": True,
                    "frames": frames,
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": duration
                }
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        except Exception as e:
            return {
                "error": f"Frame extraction failed: {str(e)}",
                "success": False
            }
    
    async def analyze_video(self, video_content: bytes, filename: str, question: Optional[str] = None) -> Dict[str, any]:
        """
        Comprehensive video analysis: extract audio, transcribe, extract frames, analyze
        
        Args:
            video_content: Video file bytes
            filename: Original filename
            question: Optional question about the video
        
        Returns:
            Dictionary with comprehensive analysis
        """
        results = {
            "success": False,
            "video_info": {},
            "audio_transcription": None,
            "frames": [],
            "analysis": None,
            "warnings": []
        }
        
        try:
            print(f"[INFO] Starting video analysis for {filename} ({len(video_content)} bytes)")
            
            # Extract audio (optional - video might not have audio)
            print("[INFO] Attempting audio extraction...")
            audio_result = await self.extract_video_audio(video_content, filename)
            if audio_result.get("success"):
                results["video_info"] = {
                    "duration": audio_result.get("duration"),
                    "fps": audio_result.get("fps"),
                    "size": audio_result.get("size")
                }
                
                # Transcribe audio
                transcription = await self.transcribe_audio(audio_result["audio_bytes"], "audio.wav")
                if transcription.get("success") and transcription.get("text") and transcription.get("text").strip() != "(No speech detected in audio)":
                    results["audio_transcription"] = transcription
                else:
                    results["warnings"].append("No audio transcription available (video may be silent or have no audio track)")
            else:
                error_msg = audio_result.get("error", "Unknown error")
                if "No audio track" in error_msg:
                    results["warnings"].append("Video has no audio track - skipping audio transcription")
                else:
                    results["warnings"].append(f"Audio extraction failed: {error_msg}")
            
            # Extract frames (should always work if video is valid)
            print("[INFO] Attempting frame extraction...")
            frames_result = await self.extract_video_frames(video_content, filename, num_frames=5)
            if frames_result.get("success") and frames_result.get("frames"):
                results["frames"] = frames_result["frames"]
                # Update video_info with frame data if not already set
                if not results.get("video_info"):
                    results["video_info"] = {
                        "duration": frames_result.get("duration", 0),
                        "fps": frames_result.get("fps", 0),
                        "total_frames": frames_result.get("total_frames", 0)
                    }
            else:
                error_msg = frames_result.get("error", "Unknown error")
                results["warnings"].append(f"Frame extraction failed: {error_msg}")
            
            # Generate analysis using LLM if we have any data
            if self.llm and (results.get("audio_transcription") or results.get("frames")):
                analysis_prompt = self._build_analysis_prompt(
                    transcription=results.get("audio_transcription"),
                    frames=results.get("frames"),
                    question=question
                )
                
                analysis = await self._analyze_with_llm(analysis_prompt)
                results["analysis"] = analysis
            elif not self.llm:
                results["warnings"].append("LLM not available for AI analysis. Please configure GOOGLE_API_KEY or OPENAI_API_KEY.")
            
            # Check if we have any results (frames OR transcription OR analysis)
            has_results = (
                (results.get("audio_transcription") and results["audio_transcription"].get("text")) or 
                (results.get("frames") and len(results["frames"]) > 0) or 
                results.get("analysis")
            )
            
            if not has_results:
                error_parts = ["Video analysis completed but no results were generated."]
                if results.get("warnings"):
                    error_parts.append("Issues:")
                    error_parts.extend(results["warnings"])
                else:
                    error_parts.append("The video might be too short, corrupted, or have no extractable content.")
                
                error_msg = " ".join(error_parts)
                print(f"[ERROR] {error_msg}")
                return {
                    "error": error_msg,
                    "success": False,
                    "warnings": results.get("warnings", [])
                }
            
            print(f"[INFO] Video analysis successful: {len(results.get('frames', []))} frames, transcription: {bool(results.get('audio_transcription'))}, analysis: {bool(results.get('analysis'))}")
            results["success"] = True
            return results
        
        except Exception as e:
            import traceback
            error_msg = str(e)
            traceback_str = traceback.format_exc()
            print(f"[ERROR] Video analysis exception: {error_msg}")
            print(f"[ERROR] Full traceback:\n{traceback_str}")
            return {
                "error": f"Video analysis failed: {error_msg}",
                "success": False,
                "details": traceback_str if os.getenv("DEBUG", "false").lower() == "true" else None
            }
        
        except Exception as e:
            return {
                "error": f"Video analysis failed: {str(e)}",
                "success": False
            }
    
    def _build_analysis_prompt(self, transcription: Optional[Dict], frames: List[Dict], question: Optional[str]) -> str:
        """Build prompt for LLM analysis"""
        prompt_parts = []
        
        if question:
            prompt_parts.append(f"Question: {question}\n\n")
        else:
            prompt_parts.append("Please analyze this video content:\n\n")
        
        if transcription and transcription.get("text"):
            prompt_parts.append(f"Audio Transcription:\n{transcription['text']}\n\n")
        
        if frames:
            prompt_parts.append(f"Video contains {len(frames)} key frames extracted at different timestamps.\n")
            prompt_parts.append("Please analyze the visual content and provide insights.\n\n")
        
        prompt_parts.append("Provide a comprehensive analysis combining the audio and visual information.")
        
        return "".join(prompt_parts)
    
    async def _analyze_with_llm(self, prompt: str) -> Optional[str]:
        """Analyze using LLM"""
        if not self.llm:
            return None
        
        try:
            if isinstance(self.llm, ChatGoogleGenerativeAI):
                message = HumanMessage(content=prompt)
                response = await self.llm.ainvoke([message])
                return response.content if hasattr(response, 'content') else str(response)
            elif isinstance(self.llm, OpenAI):
                response = self.llm.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1000
                )
                return response.choices[0].message.content
        except Exception as e:
            print(f"[WARNING] LLM analysis failed: {str(e)}")
            return None
    
    def validate_audio(self, audio_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """Validate audio file"""
        allowed_extensions = {'.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'}
        file_ext = Path(filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return False, f"Unsupported audio format. Allowed: {', '.join(allowed_extensions)}"
        
        if len(audio_content) > 100 * 1024 * 1024:  # 100MB max
            return False, "Audio file too large. Maximum size is 100MB."
        
        return True, None
    
    def validate_video(self, video_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """Validate video file"""
        allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'}
        file_ext = Path(filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            return False, f"Unsupported video format. Allowed: {', '.join(allowed_extensions)}"
        
        if len(video_content) > 500 * 1024 * 1024:  # 500MB max
            return False, "Video file too large. Maximum size is 500MB."
        
        return True, None

