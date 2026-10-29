from pathlib import Path
from PIL import Image

path = Path("/home/ubuntu/ghar-ghar-mart/assets/images/splash-icon.png")
image = Image.open(path).convert("RGBA")
image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
image.save(path, format="PNG", optimize=True, compress_level=9)
print(f"optimized {path} to {image.size}")
