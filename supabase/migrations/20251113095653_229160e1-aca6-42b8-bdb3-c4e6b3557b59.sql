-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read products
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);

-- Create policy to allow insert/update/delete (will be protected by admin page)
CREATE POLICY "Allow all operations on products"
ON public.products
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample products
INSERT INTO public.products (name, description, price, category, image_url) VALUES
('هاتف ذكي', 'هاتف ذكي بمواصفات عالية', 299.99, 'إلكترونيات', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('حقيبة جلدية', 'حقيبة أنيقة من الجلد الطبيعي', 79.99, 'إكسسوارات', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400'),
('ساعة يد', 'ساعة يد رجالية فاخرة', 149.99, 'إكسسوارات', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400'),
('سماعات لاسلكية', 'سماعات بلوتوث عالية الجودة', 59.99, 'إلكترونيات', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400');