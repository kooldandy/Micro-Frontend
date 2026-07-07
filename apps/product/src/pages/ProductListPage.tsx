import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchFailure, fetchStart, fetchSuccess, type Product } from "../store/productSlice";
import { productApi } from "../api/client";
import type { ApiError } from "@mfe/http-client";

export default function ProductListPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.product);

  useEffect(() => {
    dispatch(fetchStart());
    productApi
      .get<Product[]>("/")
      .then((res) => dispatch(fetchSuccess(res.data)))
      .catch((err: ApiError) => dispatch(fetchFailure(err.message ?? "Failed to load products")));
  }, [dispatch]);

  return (
    <div className="product-max-w-2xl product-mx-auto product-mt-10 product-p-6">
      <h1 className="product-text-xl product-font-semibold product-mb-4 product-text-slate-900">Products</h1>
      {status === "loading" && <p className="product-text-slate-500">Loading…</p>}
      {error && <p className="product-text-red-600 product-text-sm">{error}</p>}
      <ul className="product-flex product-flex-col product-gap-3">
        {items.map((product) => (
          <li
            key={product.id}
            className="product-border product-border-slate-200 product-rounded-lg product-p-4 product-flex product-justify-between product-items-center product-bg-white"
          >
            <div>
              <Link to={product.id} className="product-font-medium product-text-slate-900 product-underline">
                {product.name}
              </Link>
              <p className="product-text-sm product-text-slate-500">${product.price.toFixed(2)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
