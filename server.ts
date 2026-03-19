import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Automated Billing & Order Generation (Simulated for this demo)
  // In a real app, this would be a cron job or a scheduled function
  app.post("/api/admin/generate-daily-orders", (req, res) => {
    // Logic to fetch active subscriptions and create orders for the next day
    res.json({ message: "Daily orders generated successfully" });
  });

  app.post("/api/admin/reconcile-inventory", (req, res) => {
    // Logic to reconcile production vs delivery
    res.json({ message: "Inventory reconciled" });
  });

  // Payment Integration (JazzCash, EasyPaisa, Bank Transfer)
  app.post("/api/recharge", async (req, res) => {
    const { userId, amount, paymentMethod, email, phone } = req.body;

    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // In a real integration, you would call the respective payment gateway API here.
      // Example for JazzCash:
      // const jazzCashResponse = await fetch('https://sandbox.jazzcash.com.pk/CustomerPortal/api/v1/payments', { ... });
      
      // Example for EasyPaisa:
      // const easyPaisaResponse = await fetch('https://easypay.easypaisa.com.pk/easypay/Index.jsf', { ... });

      console.log(`Initializing ${paymentMethod} payment for user ${userId} of amount ${amount}`);

      // Simulate API processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Return a success response or a redirect URL if the gateway requires it
      // For now, we return a success message to let the client handle the simulation
      res.json({ 
        status: "success", 
        message: "Payment initialized",
        transactionId: `TXN_${Date.now()}`,
        // redirectUrl: "https://payment-gateway.com/checkout/..." 
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      res.status(500).json({ error: "Failed to initialize payment" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
