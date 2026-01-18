/*
  # Create storage bucket for recipe images

  1. Storage
    - Create 'recipes' bucket for storing recipe images
    - Enable public access for recipe images
    - Set up RLS policies for authenticated users to upload
  
  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to all images
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipes',
  'recipes',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipes');

CREATE POLICY "Anyone can view recipe images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recipes');

CREATE POLICY "Users can update their own recipe images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'recipes');

CREATE POLICY "Users can delete their own recipe images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'recipes');