
import { httpRouter } from "convex/server";

const http = httpRouter();

// Clerk webhook đã được gỡ bỏ.
// Subscription webhook sẽ được tích hợp lại với hệ thống Billing riêng
// khi hoàn thiện luồng subscription của CompanyMarketingSystem.

export default http;
