const express = require("express");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "supersecretkey"; // ⚠️ use env var in production

// =======================
// Helpers to read/write JSON
// =======================
function readDB() {
  const data = fs.existsSync("./db.json") ? JSON.parse(fs.readFileSync("./db.json")) : { products: [] };
  return data.products || [];
}

function writeDB(products) {
  fs.writeFileSync("./db.json", JSON.stringify({ products }, null, 2));
}

function readUsers() {
  const data = fs.existsSync("./users.json") ? JSON.parse(fs.readFileSync("./users.json")) : { users: [] };
  return data.users || [];
}

function writeUsers(users) {
  fs.writeFileSync("./users.json", JSON.stringify({ users }, null, 2));
}

// =======================
// PRODUCT ROUTES
// =======================

// Get all products
app.get("/products", (req, res) => {
  res.json(readDB());
});

// Get single product
app.get("/products/:id", (req, res) => {
  const products = readDB();
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// Create product
app.post("/products", (req, res) => {
  let products = readDB();
  const { name, price, image, description } = req.body;

  if (!name || !price || !image || !description) {
    return res.status(400).json({ message: "All fields required" });
  }

  const newProduct = {
    id: products.length ? products[products.length - 1].id + 1 : 1,
    name,
    price,
    image,
    description
  };

  products.push(newProduct);
  writeDB(products);

  res.status(201).json(newProduct);
});

// Update product
app.put("/products/:id", (req, res) => {
  let products = readDB();
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { name, price, image, description } = req.body;
  product.name = name || product.name;
  product.price = price || product.price;
  product.image = image || product.image;
  product.description = description || product.description;

  writeDB(products);
  res.json(product);
});

// Delete product
app.delete("/products/:id", (req, res) => {
  let products = readDB();
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Product not found" });

  const deleted = products.splice(index, 1);
  writeDB(products);

  res.json({ message: "Product deleted", deleted });
});

// =======================
// AUTH ROUTES
// =======================

// SIGNUP
app.post("/api/signup", async (req, res) => {
  let users = readUsers();
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Username & password required" });

  const existingUser = users.find(u => u.username === username);
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, password: hashedPassword };

  users.push(newUser);
  writeUsers(users);

  res.status(201).json({ message: "User created successfully" });
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const users = readUsers();
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.json({ message: "Login successful", token });
});

// =======================
// START SERVER
// =======================
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
