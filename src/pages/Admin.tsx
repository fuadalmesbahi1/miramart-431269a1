import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Plus, Pencil, Trash2, LogOut, Search, Upload, ImageIcon, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { z } from "zod";
import type { User, Session } from '@supabase/supabase-js';

// Product validation schema
const productSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب").max(200, "اسم المنتج طويل جداً"),
  description: z.string().trim().max(2000, "الوصف طويل جداً").optional().nullable(),
  price: z.number().positive("السعر يجب أن يكون موجباً").max(999999, "السعر مرتفع جداً").finite("السعر غير صالح"),
  image_url: z.string().url("رابط الصورة غير صالح").max(500, "رابط الصورة طويل جداً").optional().nullable().or(z.literal("")),
  category: z.string().trim().max(100, "التصنيف طويل جداً").optional().nullable(),
  in_stock: z.boolean()
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
}

// كلمة المرور للحماية الأولية
const ADMIN_ACCESS_PASSWORD = "mira2024";

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Two-step add product states
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    in_stock: true,
  });

  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    return localStorage.getItem("whatsapp_number") || "777168938";
  });
  const [adminSearchQuery, setAdminSearchQuery] = useState("");

  const handleSaveWhatsapp = () => {
    if (!whatsappNumber.trim()) {
      toast.error("يرجى إدخال رقم الواتساب");
      return;
    }
    localStorage.setItem("whatsapp_number", whatsappNumber.trim());
    toast.success("تم حفظ رقم الواتساب بنجاح");
  };


  // Check authentication and admin status
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin role when user changes
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error checking admin role:", error);
      }
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: isAdmin,
  });

  const filteredAdminProducts = products?.filter((product) => {
    if (!adminSearchQuery) return true;
    return product.name.toLowerCase().includes(adminSearchQuery.toLowerCase());
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Validate input
      const validated = productSchema.parse({
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        image_url: data.image_url || null,
        category: data.category || null,
        in_stock: data.in_stock,
      });

      const { error } = await supabase.from("products").insert([{
        name: validated.name,
        description: validated.description ?? null,
        price: validated.price,
        image_url: validated.image_url ?? null,
        category: validated.category ?? null,
        in_stock: validated.in_stock,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تمت إضافة المنتج بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("حدث خطأ أثناء إضافة المنتج");
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      // Validate input
      const validated = productSchema.parse({
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        image_url: data.image_url || null,
        category: data.category || null,
        in_stock: data.in_stock,
      });

      const { error } = await supabase
        .from("products")
        .update({
          name: validated.name,
          description: validated.description ?? null,
          price: validated.price,
          image_url: validated.image_url ?? null,
          category: validated.category ?? null,
          in_stock: validated.in_stock,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم تحديث المنتج بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("حدث خطأ أثناء تحديث المنتج");
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم حذف المنتج بنجاح");
    },
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("تم تسجيل الدخول بنجاح");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`
          }
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("هذا البريد الإلكتروني مسجل بالفعل");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول.");
          setAuthMode("login");
        }
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء المصادقة");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج بنجاح");
    navigate("/");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category: "",
      in_stock: true,
    });
    setEditingProduct(null);
    setAddStep(1);
    setUploadedImageUrl("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('mira-img')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mira-img')
        .getPublicUrl(filePath);

      setUploadedImageUrl(publicUrl);
      setAddStep(2);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("حدث خطأ أثناء رفع الصورة: " + (error.message || "خطأ غير معروف"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      image_url: product.image_url || "",
      category: product.category || "",
      in_stock: product.in_stock,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation before zod
    if (!formData.name || !formData.price) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price)) {
      toast.error("السعر غير صالح");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      // Use uploaded image URL for new products
      addMutation.mutate({ ...formData, image_url: uploadedImageUrl });
    }
  };

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessPassword === ADMIN_ACCESS_PASSWORD) {
      setAccessGranted(true);
      toast.success("تم التحقق بنجاح");
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  // شاشة إدخال كلمة المرور للحماية الأولية
  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">الدخول محمي</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessSubmit} className="space-y-4">
              <div>
                <Label htmlFor="accessPassword">كلمة المرور</Label>
                <Input
                  id="accessPassword"
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="text-right"
                  required
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white">
                دخول
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                العودة للمتجر
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني"
                  className="text-right"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="text-right"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white">
                {authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              >
                {authMode === "login" ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟ سجل الدخول"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                العودة للمتجر
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">غير مصرح</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              ليس لديك صلاحيات الوصول إلى لوحة التحكم. يرجى الاتصال بالمسؤول لمنحك صلاحيات المدير.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل الخروج
              </Button>
              <Button onClick={() => navigate("/")} variant="default" className="w-full">
                العودة للمتجر
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للمتجر
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* إعدادات الواتساب */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>إعدادات الواتساب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor="whatsappNumber">رقم الواتساب لاستقبال الطلبات</Label>
                <Input
                  id="whatsappNumber"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="مثال: 967773226263"
                  className="text-left"
                  dir="ltr"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  أدخل الرقم بالصيغة الدولية بدون علامة + (مثال: 967773226263)
                </p>
              </div>
              <Button onClick={handleSaveWhatsapp} className="gradient-primary text-white">
                حفظ الرقم
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold">إدارة المنتجات</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث عن منتج..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              className="pr-10 text-right"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="ml-2 h-4 w-4" />
                إضافة منتج جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "تعديل المنتج" : addStep === 1 ? "الخطوة 1: رفع صورة المنتج" : "الخطوة 2: بيانات المنتج"}
                </DialogTitle>
              </DialogHeader>
              
              {/* Step 1: Image Upload (only for new products) */}
              {!editingProduct && addStep === 1 && (
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-primary/50 transition-colors">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">جاري رفع الصورة...</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-medium mb-2">اختر صورة المنتج</p>
                        <p className="text-sm text-muted-foreground mb-4">يجب رفع صورة قبل إضافة بيانات المنتج</p>
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            <Upload className="h-4 w-4" />
                            <span>اختر صورة</span>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Product Form (for new products after image upload) */}
              {!editingProduct && addStep === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Show uploaded image preview */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                      <img
                        src={uploadedImageUrl}
                        alt="صورة المنتج"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="name">اسم المنتج *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسم المنتج"
                      className="text-right"
                      required
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="أدخل وصف المنتج"
                      className="text-right min-h-[100px]"
                      maxLength={2000}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">السعر (بالريال) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="text-right"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">التصنيف</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="in_stock"
                      checked={formData.in_stock}
                      onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                    />
                    <Label htmlFor="in_stock">متوفر في المخزون</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary text-white">
                      حفظ المنتج
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              )}

              {/* Edit Product Form (shows all fields including image URL) */}
              {editingProduct && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">اسم المنتج *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسم المنتج"
                      className="text-right"
                      required
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="أدخل وصف المنتج"
                      className="text-right min-h-[100px]"
                      maxLength={2000}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">السعر (بالريال) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="999999"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="text-right"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">التصنيف</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="image_url">رابط الصورة</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="text-right"
                      maxLength={500}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="in_stock"
                      checked={formData.in_stock}
                      onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                    />
                    <Label htmlFor="in_stock">متوفر في المخزون</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary text-white">
                      تحديث المنتج
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdminProducts?.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-square overflow-hidden bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    لا توجد صورة
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.in_stock ? 'متوفر' : 'غير متوفر'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  {product.category && (
                    <p className="text-sm text-muted-foreground">
                      التصنيف: {product.category}
                    </p>
                  )}
                  <p className="text-xl font-bold text-primary">
                    {Math.round(product.price)} ريال
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="ml-2 h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد منتجات. قم بإضافة منتج جديد للبدء.
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
