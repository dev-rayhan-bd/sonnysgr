import { z } from "zod";

        
const initiateChatZodSchema = z.object({
    body: z.object({
        // senderId: z.string().min(24, "Sender ID is required"),
        receiverId: z.string().min(24, "Receiver ID is required"),
        // address: z.string().optional(),
    }),
});

const ChatValidations = { initiateChatZodSchema };

export default ChatValidations;