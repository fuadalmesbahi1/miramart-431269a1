import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

const Cart = ({ isOpen, onClose, items, onRemoveItem, onCheckout }: CartProps) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            سلة المشتريات
          </SheetTitle>
        </SheetHeader>
        
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">سلة المشتريات فارغة</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6 my-6 h-[calc(100vh-280px)]">
              <div className="space-y-4 pb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{item.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        الكمية: {item.quantity}
                      </p>
                      <p className="font-semibold gradient-primary bg-clip-text text-transparent">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="space-y-4 pt-4 border-t shrink-0">
              <div className="flex justify-between text-lg font-semibold">
                <span>المجموع:</span>
                <span className="gradient-primary bg-clip-text text-transparent">
                  ${total.toFixed(2)}
                </span>
              </div>
              
              <Button
                className="w-full gradient-primary text-white border-0 h-12 text-lg"
                onClick={onCheckout}
              >
                إتمام الطلب عبر واتساب
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Cart;
