//  runs server.js
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());

// project folder and where it grabs from the this folder
const projectPath = path.join(__dirname, "public");
app.use(express.static(projectPath));

// tax rate
const taxRate = 0.08;
//array of listed products and their attributes. NAME/PRICE/DESCRIPTION AND IMAGE OF ANIMAL
const products = [
  {
    id: 1,
    B_name: "Blue-Tongued Skink",
    B_price: 349.99,
    B_desc:
      "A friendly, hardy lizard known for its bright blue tongue and calm personality. Great for beginners.",
    B_img: "/images/Skink.jpg",
  },
  {
    id: 2,
    B_name: "Panther Chameleon",
    B_price: 429.99,
    B_desc:
      "Colorful chameleon that changes colors based on mood and environment.",
    B_img: "/images/Chameleon.jpg",
  },
  {
    id: 3,
    B_name: "Ball Python",
    B_price: 199.99,
    B_desc: "Docile snake that is easy to handle and care for.",
    B_img: "/images/Python.jpg",
  },
  {
    id: 4,
    B_name: "Fennec Fox",
    B_price: 1299.99,
    B_desc: "Small desert fox with huge ears and a playful personality.",
    B_img: "/images/Fox.jpg",
  },
  {
    id: 5,
    B_name: "Sulcata Tortoise",
    B_price: 399.99,
    B_desc:
      "Long-lived tortoise that can grow quite large; best for experienced keepers.",
    B_img: "/images/Tortoise.jpg",
  },
  {
    id: 6,
    B_name: "Blue-and-Gold Macaw",
    B_price: 2499.99,
    B_desc: "Large, intelligent parrot with striking blue and yellow feathers.",
    B_img: "/images/Macaw.jpg",
  },
  {
    id: 7,
    B_name: "Ring-Tailed Cat",
    B_price: 799.99,
    B_desc: "Agile, curious mammal with a distinctive ringed tail.",
    B_img: "/images/RingTailedCat.jpg",
  },
  {
    id: 8,
    B_name: "Tanuki (Raccoon Dog)",
    B_price: 899.99,
    B_desc: "Mischievous and fluffy canid with a raccoon-like mask.",
    B_img: "/images/Tanuki.jpg",
  },
  {
    id: 9,
    B_name: "Sugar Glider",
    B_price: 249.99,
    B_desc: "Tiny nocturnal gliding marsupial that loves to climb and glide.",
    B_img: "/images/Glider.jpg",
  },
  {
    id: 10,
    B_name: "Bengal Cat",
    B_price: 1199.99,
    B_desc: "Spotted cat with wild-looking patterns and high energy.",
    B_img: "/images/BengalCat.jpg",
  },
  {
    id: 11,
    B_name: "Sphynx Cat",
    B_price: 1399.99,
    B_desc: "Hairless cat with big ears and super affectionate behavior.",
    B_img: "/images/SphynxCat.jpg",
  },
  {
    id: 12,
    B_name: "Capuchin Monkey",
    B_price: 4999.99,
    B_desc: "Highly intelligent primate; requires experienced, committed owners.",
    B_img: "/images/Monkey.jpg",
  },
];

let cart = [];
let orders = [];

// section of front end 

app.get("/", (req, res) => {
  res.sendFile(path.join(projectPath, "index.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(projectPath, "cart.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(projectPath, "checkout.html"));
});

app.get("/confirmation", (req, res) => {
  res.sendFile(path.join(projectPath, "confirmation.html"));
});

//Start of the backend API

// products list
app.get("/B_getproducts", (req, res) => {
  res.json({ products, taxRate });
});

// add to cart
app.post("/B_addtocart", (req, res) => {
  const { id, quantity } = req.body;
  const qty = Number(quantity) || 1;

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ id, quantity: qty });
  }

  res.json({ success: true, cart });
});

// cart count
app.get("/B_getcartcount", (req, res) => {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ count });
});

// full cart items
app.get("/B_getcartitems", (req, res) => {
  const items = cart.map((item) => {
    const product = products.find((p) => p.id === item.id);
    return { ...item, product };
  });
  res.json({ items, taxRate });
});

//this changes the quantity of the selected item 
app.put("/B_updateQuantity", (req, res) => {
  const { id, quantity } = req.body;
  const qty = Number(quantity);

  const existing = cart.find((item) => item.id === id);
  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Item not in cart" });
  }

  if (qty <= 0) {
    cart = cart.filter((item) => item.id !== id);
  } else {
    existing.quantity = qty;
  }

  res.json({ success: true, cart });
});

// remove  a item from the cart
app.delete("/B_removefromcart", (req, res) => {
  const { id } = req.body;
  cart = cart.filter((item) => item.id !== id);
  res.json({ success: true, cart });
});

// checkout
app.post("/B_checkout", (req, res) => {
  const { customerInfo } = req.body;

  const items = cart.map((item) => {
    const product = products.find((p) => p.id === item.id);
    //retruns the selected product and their listed attributes
    return {
      id: item.id,
      name: product?.B_name,
      price: product?.B_price,
      quantity: item.quantity,
    };
  });

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  //this is the layout of info that comes in the order
  const order = {
    id: orders.length + 1,
    items,
    subtotal,
    tax,
    total,
    customerInfo: customerInfo || {},
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  cart = []; // this empties out the cart from what the user previously done 

  res.json({ success: true, order });
});

// this grabs all the orders 
app.get("/B_getorders", (req, res) => {
  res.json({ orders });
});

// the followoing will print out the starting messages once the server is ran 
app.listen(PORT, () => {
  console.log("========================================");
  console.log("🦎 Exotic Pets E-Commerce Backend");
  console.log("========================================");
  console.log(`Server:  http://localhost:${PORT}`);
  console.log(`Products: ${products.length} exotic pets`);
  console.log(`Tax Rate: ${taxRate * 100}%`);
  console.log("========================================");
  console.log(" GO TO http://localhost:3000  in URL");
});
