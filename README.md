## 🧠 My Understanding of the Problem

While working on this project, I tried to understand the system in a practical way instead of just reading definitions.

I imagined a simple scenario:

A buyer (let’s call him Ravi) wants to transport goods from one city to another. Instead of contacting one supplier, he creates an **RFQ (Request for Quotation)** where multiple suppliers can participate and compete by offering better prices. :contentReference[oaicite:0]{index=0}  

Now suppose three suppliers join:
- Arjun  
- Bhavna  
- Charan  

Initially, they submit bids like:
- ₹10,000  
- ₹9,500  
- ₹9,200  

At this point, Charan is leading since he has the lowest price (L1).

---

## 🔥 What Makes This System Different

This is not a normal auction. It follows a **British Auction style**, where suppliers can continuously lower their bids and compete in real time.

The key idea here is how the system handles **last-minute bidding**.

There is a concept called a **trigger window** (for example, last 10 minutes before closing). During this time, the system closely monitors activity.

---

## 💥 Handling Last-Minute Bids

Let’s say the auction is supposed to end at 6:00 PM.

At 5:55 PM, Bhavna submits a better bid (₹8,800), becoming the new lowest bidder.

If the auction ended at 6:00 PM, others wouldn’t get a fair chance to respond.  
So instead of closing, the system **automatically extends the auction time** (for example, by 5 minutes).

Now the new closing time becomes 6:05 PM.

---

## ⚡ Continuous Competition

This creates a chain reaction:

If someone again places a better bid near the new closing time, the auction extends again.

This keeps the competition active and prevents someone from winning just by placing a bid at the very last second.

---

## 🚫 Forced Closing (Important Constraint)

One important constraint is that the auction cannot extend forever.

There is a **forced close time**, which acts as a hard limit.  
Even if bids keep coming in, the auction must stop after this time.

---

## 🎯 Final Understanding

From my perspective, the goal of this system is:

- To encourage real-time competition among suppliers  
- To prevent unfair last-second bidding  
- To maintain transparency (everyone can see rankings)  
- To ensure the buyer gets the best possible price  