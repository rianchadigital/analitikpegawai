#!/usr/bin/env python3
import os
import shutil
import zipfile

def pack():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(base_dir, 'dist')
    public_dir = os.path.join(base_dir, 'public')
    images_src = os.path.join(public_dir, 'images')
    root_images = os.path.join(base_dir, 'images')
    dist_images = os.path.join(dist_dir, 'images')
    
    # 1. Sync images to root and dist
    if os.path.exists(images_src):
        os.makedirs(root_images, exist_ok=True)
        os.makedirs(dist_images, exist_ok=True)
        for img in os.listdir(images_src):
            s = os.path.join(images_src, img)
            if os.path.isfile(s):
                shutil.copy2(s, os.path.join(root_images, img))
                shutil.copy2(s, os.path.join(dist_images, img))
    
    # 2. Sync api-sync.php and .htaccess
    api_php = os.path.join(public_dir, 'api-sync.php')
    if os.path.exists(api_php):
        shutil.copy2(api_php, os.path.join(base_dir, 'api-sync.php'))
        shutil.copy2(api_php, os.path.join(dist_dir, 'api-sync.php'))
        
    htaccess = os.path.join(base_dir, '.htaccess')
    if os.path.exists(htaccess):
        shutil.copy2(htaccess, os.path.join(dist_dir, '.htaccess'))
        shutil.copy2(htaccess, os.path.join(public_dir, '.htaccess'))

    # 3. Create fresh public/hostinger_public_html.zip
    zip_path = os.path.join(public_dir, 'hostinger_public_html.zip')
    if os.path.exists(zip_path):
        os.remove(zip_path)
        
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                z.write(full_path, rel_path)
    
    # Also copy zip to dist so it is available in dist
    shutil.copy2(zip_path, os.path.join(dist_dir, 'hostinger_public_html.zip'))
    print(f"Pack completed: {zip_path} updated with {len(os.listdir(dist_dir))} root items.")

if __name__ == '__main__':
    pack()
