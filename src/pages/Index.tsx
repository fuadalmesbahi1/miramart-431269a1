import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import Cart from "@/components/Cart";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "@/lib/categories";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import heroBanner from "@/assets/hero-banner.png";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("in_stock", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success("تمت الإضافة للسلة");
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("تم الحذف من السلة");
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    const whatsappNumber = localStorage.getItem("whatsapp_number") || "967773226263";
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    let message = "مرحباً، أود طلب المنتجات التالية:\n\n";
    cartItems.forEach((item) => {
      message += `• ${item.name}\n  الكمية: ${item.quantity}\n  السعر: $${(item.price * item.quantity).toFixed(2)}\n\n`;
    });
    message += `الإجمالي: $${total.toFixed(2)}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products?.filter((product) => {
    const matchesCategory = selectedCategory === "الكل" || product.category === selectedCategory;
    const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={cartItemsCount} onCartClick={() => setIsCartOpen(true)} />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">
            مرحباً بك في متجرنا
          </h1>
          <img 
            src={heroBanner} 
            alt="متجر ميرة" 
            className="mx-auto w-[500px] h-[500px] object-contain -mt-16 -mb-20"
          />
          <p className="text-lg text-muted-foreground">
            <span 
              onClick={() => navigate("/admin")} 
              className="cursor-default select-none"
              style={{ fontSize: '8px' }}
            >
              •
            </span>
            اكتشف منتجاتنا المميزة واطلب ما تحتاجه عبر واتساب
            <span className="select-none" style={{ fontSize: '8px' }}>•</span>
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 text-right"
            />
          </div>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 h-auto p-2">
              <TabsTrigger value="الكل" className="whitespace-nowrap w-full">
                الكل
              </TabsTrigger>
              {CATEGORIES.map((category) => (
                <TabsTrigger key={category} value={category} className="whitespace-nowrap w-full">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">لا توجد منتجات في هذا التصنيف</p>
          </div>
        )}

      </main>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Index;
