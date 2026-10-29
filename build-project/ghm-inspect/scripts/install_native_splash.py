from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/webdev-static-assets/ghar-ghar-mart-native-splash.png')
target = Path('/home/ubuntu/ghar-ghar-mart/assets/images/splash-icon.png')

image = Image.open(source).convert('RGB')
image.thumbnail((768, 768), Image.Resampling.LANCZOS)
image.save(target, format='PNG', optimize=True, compress_level=9)
print(f'installed {target} ({target.stat().st_size} bytes, {image.width}x{image.height})')
