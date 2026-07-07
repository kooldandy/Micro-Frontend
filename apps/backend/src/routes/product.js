import { Router } from "express";
import { getAllProducts, getProductById } from "../data/products.js";

export const productRouter = Router();

productRouter.get("/", (_req, res) => {
  res.json(getAllProducts());
});

productRouter.get("/:id", (req, res) => {
  const product = getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ message: "product not found" });
    return;
  }
  res.json(product);
});
