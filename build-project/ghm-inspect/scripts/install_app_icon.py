from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/webdev-static-assets/ghar-ghar-mart-app-icon-v2.png')
asset_dir = Path('/home/ubuntu/ghar-ghar-mart/assets/images')

targets = [
    asset_dir / 'icon.png',
    asset_dir / 'android-icon-foreground.png',
    asset_dir / 'android-icon-monochrome.png',
    asset_dir / 'favicon.png',
]

image = Image.open(source).convert('RGB')
image.thumbnail((512, 512), Image.Resampling.LANCZOS)
for target in targets:
    image.save(target, format='PNG', optimize=True, compress_level=9)
    print(f'installed {target} ({target.stat().st_size} bytes, {image.width}x{image.height})')
