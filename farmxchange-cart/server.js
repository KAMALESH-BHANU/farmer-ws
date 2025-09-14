const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();

// ✅ Increase Payload Limit to Fix "PayloadTooLargeError"
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// ✅ Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/farmxchange", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// -------------------- CART SCHEMA & ENDPOINTS --------------------

const CartSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
});
const CartItem = mongoose.model("CartItem", CartSchema);

// ✅ Add an item to the cart
app.post("/add-to-cart", async (req, res) => {
  try {
    const { name, price, image } = req.body;
    if (!name || !price || !image) {
      return res.status(400).json({ error: "❌ Missing required fields" });
    }
    const newItem = new CartItem({ name, price, image });
    await newItem.save();
    res.json({ message: "🛒 Item added to cart!", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "❌ Error adding item to cart" });
  }
});

// ✅ Get all cart items
app.get("/cart-items", async (req, res) => {
  try {
    const items = await CartItem.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "❌ Error fetching cart items" });
  }
});

// ✅ Remove an item from the cart
app.delete("/remove-from-cart/:id", async (req, res) => {
  try {
    const deletedItem = await CartItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: "❌ Item not found in cart" });
    }
    res.json({ message: "🗑️ Item removed from cart" });
  } catch (error) {
    res.status(500).json({ error: "❌ Error removing item from cart" });
  }
});

// -------------------- PRODUCT SCHEMA & ENDPOINTS --------------------

// ✅ Configure Multer Storage (Increase File Upload Limit)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Increase file upload size limit to 50MB
});

const ProductSchema = new mongoose.Schema({
  productName: String,
  category: String,
  quantity: Number,
  price: Number,
  description: String,
  image: String,
});
const Product = mongoose.model("Product", ProductSchema);

// ✅ Add Product (Farmer Input)
app.post("/add-item", upload.single("image"), async (req, res) => {
  try {
    const { productName, category, quantity, price, description } = req.body;
    const image = req.file ? req.file.buffer.toString("base64") : null;

    if (!productName || !category || !quantity || !price || !description || !image) {
      return res.status(400).json({ error: "❌ All fields are required" });
    }

    const newProduct = new Product({
      productName,
      category,
      quantity: parseInt(quantity),
      price: parseFloat(price),
      description,
      image,
    });
    await newProduct.save();
    res.json({ message: "✅ Product added successfully!", product: newProduct });
  } catch (error) {
    res.status(500).json({ error: "❌ Error adding product" });
  }
});

// ✅ Fetch Products with Category Filtering (For `fruit.html`, `veg.html`, etc.)
app.get("/products", async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "❌ Error fetching products" });
  }
});

// ✅ Delete a Product (Removes from Products & Cart)
app.delete("/delete-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found" });
    }

    // ✅ Delete product from Products collection
    await Product.findByIdAndDelete(req.params.id);

    // ✅ Remove matching product from the Cart (case-insensitive search)
    await CartItem.deleteMany({ name: { $regex: new RegExp(`^${product.productName}$`, "i") } });

    res.json({ message: "🗑️ Product deleted successfully from Products & Cart!" });
  } catch (error) {
    res.status(500).json({ error: "❌ Error deleting product" });
  }
});

// -------------------- SERVER START --------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
