const products = [
  { id: "p_1", name: "Mechanical Keyboard", price: 89.99, description: "Hot-swappable switches, USB-C, per-key RGB." },
  { id: "p_2", name: "4K Monitor", price: 349.0, description: "27-inch IPS panel, 144Hz, USB-C with 90W power delivery." },
  { id: "p_3", name: "Ergonomic Mouse", price: 45.5, description: "Vertical grip, adjustable DPI, silent clicks." },
  { id: "p_4", name: "Standing Desk", price: 499.0, description: "Electric height adjustment, memory presets." },
  { id: "p_5", name: "Noise-Cancelling Headphones", price: 229.0, description: "30-hour battery, adaptive ANC." },
];

export function getAllProducts() {
  return products;
}

export function getProductById(id) {
  return products.find((p) => p.id === id);
}
