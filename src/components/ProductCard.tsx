import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  in_stock: boolean;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <Card className="card-hover overflow-hidden border-border/50">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"}
          alt={product.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
          {product.category && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {product.category}
            </Badge>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            ${product.price}
          </span>
          {!product.in_stock && (
            <Badge variant="destructive">غير متوفر</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full gradient-primary text-white border-0"
          onClick={() => onAddToCart(product)}
          disabled={!product.in_stock}
        >
          <Plus className="ml-2 h-4 w-4" />
          إضافة للسلة
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
