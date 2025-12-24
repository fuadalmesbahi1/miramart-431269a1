-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mira-img', 'mira-img', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anyone to view images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'mira-img');

-- Create policy to allow admins to upload images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mira-img' AND public.has_role(auth.uid(), 'admin'));

-- Create policy to allow admins to update images
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mira-img' AND public.has_role(auth.uid(), 'admin'));

-- Create policy to allow admins to delete images
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'mira-img' AND public.has_role(auth.uid(), 'admin'));