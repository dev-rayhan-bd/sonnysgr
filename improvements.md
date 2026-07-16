# Project Quality & Security Improvements Plan

This document details all critical issues, logical bugs, and security vulnerabilities identified in the project, categorized by module, with their cause and the best recommended solutions.

---

## 1. Authentication & Security Middleware

### Issue: Unhandled Token Header Logic (Request Hanging Vulnerability)
* **What Issue**: If the `Authorization` header is present but does not start with the `"Bearer"` prefix, the middleware gets stuck. It does not call `next()` or throw an error.
* **Why It Occurred**: In [auth.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/middlewares/auth.ts), the `if (tokenWithBearer.startsWith("Bearer"))` conditional wraps the authentication logic. However, there is no `else` block or fallback handler when the header is present but formatted incorrectly.
* **Best Solution**: Refactor the token extraction to check for the `"Bearer "` prefix and immediately throw a `401 Unauthorized` API Error if the header is malformed.
  ```typescript
  if (!tokenWithBearer.startsWith("Bearer ")) {
    throw new ApiError(401, "Invalid token format. Bearer token required.");
  }
  const token = tokenWithBearer.split(" ")[1];
  ```

---

## 2. Order Module

### Issue A: Mismatched Controller in Routes (Order Acceptance Failure)
* **What Issue**: The API endpoint for accepting orders does not trigger the acceptance logic.
* **Why It Occurred**: In [Order.routes.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Order/Order.routes.ts#L22-L26), the `/retailer-accept-order/:id` route is bound to `OrderController.getOrderDetailController` instead of `OrderController.retailerAcceptOrder`.
* **Best Solution**: Correct the route mapping to use the proper controller function:
  ```typescript
  OrderRouter.post(
      "/retailer-accept-order/:id",
      authorizeUser,
      OrderController.retailerAcceptOrder
  );
  ```

### Issue B: Missing Authentication Middleware
* **What Issue**: Retailer order details and acceptance actions are accessible without authentication.
* **Why It Occurred**: The `authorizeUser` middleware is commented out for `/get-order-detail/:id` and `/retailer-accept-order/:id` in [Order.routes.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Order/Order.routes.ts).
* **Best Solution**: Uncomment and apply the `authorizeUser` middleware to secure these endpoints.

### Issue C: Invalid Model Query in Order Details
* **What Issue**: Searching for order details fails or returns empty/incorrect results.
* **Why It Occurred**: In [Order.service.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Order/Order.service.ts#L613-L623), the function `getOrderDetailsById` uses `OrderItemModel` instead of `OrderModel` to look up an order by its primary ID (`orderId`).
* **Best Solution**: Change the model query to reference `OrderModel` or search for order items matching the `orderId` foreign key:
  ```typescript
  const order = await OrderModel.findById(orderId).lean();
  ```

### Issue D: Unused and Unexposed Checkout Logic
* **What Issue**: The checkout pipeline exists in the codebase but cannot be consumed by the frontend application.
* **Why It Occurred**: `checkoutService` in [Checkout.service.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Order/Checkout.service.ts) is implemented but never imported or exposed by any controller or route.
* **Best Solution**: Create a controller function for checking out, map it to a POST route under `/order/checkout` in `Order.routes.ts`, and apply schema validation.

### Issue E: Custom Error Information Loss
* **What Issue**: Custom API status codes (such as `400 Bad Request` or `404 Not Found`) are lost during database checkout failures.
* **Why It Occurred**: In the catch block of `checkoutService`, the caught error is wrapped in a generic JavaScript `Error`:
  ```typescript
  catch (error: any) {
      await session.abortTransaction();
      throw new Error(error.message);
  }
  ```
  This discards custom fields of `ApiError` instances.
* **Best Solution**: Propagate the error directly after aborting the transaction:
  ```typescript
  catch (error: any) {
      await session.abortTransaction();
      throw error;
  }
  ```

---

## 3. Cart & Payment Verification Modules

### Issue: Over-Invalidation of Cart Items (Cart Clearing Bug)
* **What Issue**: During checkout, an order is placed for specific items. However, if a user adds a new item to their cart after checkout but before the payment success webhook triggers, that new item is cleared and marked as `"ORDERED"` without being paid for.
* **Why It Occurred**: In [PaymentSuccess.service.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Payment/PaymentSuccess.service.ts#L101-L110), the cart cleanup query matches all `"ACTIVE"` carts for the buyer instead of matching only the items that were checked out:
  ```typescript
  await CartModel.updateMany(
      { buyerId: order.buyerId, status: "ACTIVE" },
      { status: "ORDERED" },
      { session }
  );
  ```
* **Best Solution**: Update only the cart documents associated with the products contained in the paid order, or store the specific cart item IDs in the order and update those.

---

## 4. Chat Module

### Issue A: Role Hardcoding and Swapping
* **What Issue**: Conversations between Retailers and Resellers get their roles swapped if the Retailer initiates the contact.
* **Why It Occurred**: In `sendMessage` ([Chat.service.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Chat/Chat.service.ts)), conversation creation hardcodes the sender as the reseller and the receiver as the retailer:
  ```typescript
  conversation = await ConversationModel.create({
    reseller: senderId,
    retailer: receiverId,
    status: "Accepted"
  });
  ```
* **Best Solution**: Inspect the actual user roles of the sender and receiver before creating the conversation record, mapping them correctly to `reseller` and `retailer` fields based on their roles.

### Issue B: Legacy User Model Query Failure
* **What Issue**: Message sending fails to fetch sender information, resulting in `null` object properties.
* **Why It Occurred**: `sendMessage` queries the legacy dating-themed `UserModel` using `senderId` (which is a Profile ID from `BuyerModel`, `ResellerModel`, or `RetailerModel`):
  ```typescript
  const user: any = await UserModel.findById(senderId).select("name").lean();
  ```
* **Best Solution**: Determine the correct Profile Model (`BuyerModel`, `ResellerModel`, or `RetailerModel`) based on the sender's role, and query that model instead of `UserModel`.

### Issue C: Role Incompatibility for Buyers
* **What Issue**: Buyers are excluded from chat features, and search pipelines break when a Buyer attempts to load chats.
* **Why It Occurred**: `getChatList` defaults to matching the `retailer` field if the user role is not `RESELLER`, neglecting the `Buyer` role.
* **Best Solution**: Extend the aggregation pipeline in `getChatList` to handle all three roles (`Buyer`, `Reseller`, `Retailer`).

### Issue D: Notification Receiver Model Hardcoding
* **What Issue**: Creating chat requests triggers database lookup errors or incorrect references.
* **Why It Occurred**: In `sendConversationRequest`, the notification is hardcoded to `toModel: "Buyer"`, regardless of the receiver's actual role.
* **Best Solution**: Resolve the receiver's role dynamically and pass the correct model name (e.g. `"Reseller"` or `"Retailer"`) as the `toModel` parameter.

---

## 5. Socket.io System

### Issue: Unhandled Async Exceptions (Server Instability)
* **What Issue**: Errors within real-time event listeners can cause unhandled promise rejections and server instability.
* **Why It Occurred**: In [Chat.socket.ts](file:///w:/RabeyasProjects/BdCalling/sonnysgr_backend/src/app/module/Chat/Chat.socket.ts), asynchronous callbacks are not wrapped in `try/catch` blocks.
* **Best Solution**: Wrap all socket callbacks in try/catch blocks and emit a standardized socket error event back to the client:
  ```typescript
  socket.on("send_message", async (data) => {
    try {
      // Logic...
    } catch (error: any) {
      socket.emit("error", { message: error.message });
    }
  });
  ```

---

## 6. General Routing & Setup

### Issue: Redundant Dashboard Route Registration
* **What Issue**: Unnecessary route mounting and middleware overhead for `/dashboard`.
* **Why It Occurred**: `/dashboard` route is registered twice in `src/app/routes/index.ts`.
* **Best Solution**: Remove the duplicate registration block from the `moduleRoutes` array.
