import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { emit } from "@mfe/event-bus";
import { useAppDispatch } from "../store/hooks";
import { addToCart } from "../store/cartSlice";
import { productApi } from "../api/client";
import type { Product } from "../store/productSlice";
import type { ApiError } from "@mfe/http-client";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const dispatch = useAppDispatch();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    productApi
      .get<Product>(`/${productId}`)
      .then((res) => setProduct(res.data))
      .catch((err: ApiError) => setError(err.message ?? "Failed to load product"));
  }, [productId]);

  function handleAddToCart() {
    if (!product) return;
    dispatch(addToCart({ productId: product.id, quantity: 1 }));
    emit("product:added-to-cart", { productId: product.id, quantity: 1 });
  }

  if (error) return <p className="product-text-center product-mt-10 product-text-red-600">{error}</p>;
  if (!product) return <p className="product-text-center product-mt-10 product-text-slate-500">Loading…</p>;

  return (
    <div className="product-max-w-2xl product-mx-auto product-mt-10 product-p-6 product-rounded-lg product-border product-border-slate-200 product-shadow-sm product-bg-white">
      <h1 className="product-text-xl product-font-semibold product-text-slate-900">{product.name}</h1>
      <p className="product-text-slate-500 product-mt-1">${product.price.toFixed(2)}</p>
      <p className="product-text-slate-700 product-mt-4">{product.description}</p>
      <button
        onClick={handleAddToCart}
        className="product-bg-slate-900 product-text-white product-rounded product-py-2 product-px-4 product-mt-4"
      >
        Add to cart
      </button>
    </div>
  );
}
