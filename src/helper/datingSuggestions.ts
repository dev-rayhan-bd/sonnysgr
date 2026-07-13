// import { IDatingPayload } from "../app/module/Date/Date.interface";
// import openai from "../config/openAI";
// import ApiError from "../error/ApiError";

// export const generateDatingSuggestionFromAI = async (payload: IDatingPayload) => {

//     let parsedJsonResponse;

//     const prompt = `
// You are an expert dating assistant inside a modern couples app.

// Your task is to generate HIGH-QUALITY, REALISTIC, and CONTEXT-AWARE dating suggestions.

// ----------------------
// INPUT CONTEXT:
// ----------------------
// City: ${payload.city}
// Mood: ${payload.mood} (Options: Romantic, Adventurous, Cozy, Playful, Spontaneous)
// Vibe: ${payload.vibe} (Options: Foodie, Artsy, Outdoor, Cozy, Luxe, Hidden Gems)
// Time of Day: ${payload.timeOfDay} (Options: Morning, Afternoon, Evening, Night, Late Night)
// Start Time: ${payload.startTime}
// Budget: ${payload.budget} (Options: Budget Friendly, Moderate, Splurge)

// ----------------------
// INSTRUCTIONS:
// ----------------------

// 1. Generate EXACTLY 2 unique dating suggestions.

// 2. Each suggestion must:
// - Match the selected Mood and Vibe
// - Be appropriate for the Time of Day
// - Respect the Budget level
// - Be realistic for the given City (no fictional places)

// 3. Budget Rules:
// - Budget Friendly → low-cost/free activities (parks, street food, walking, free galleries)
// - Moderate → mid-range cafes, casual dining, small activities
// - Splurge → premium restaurants, luxury experiences, exclusive venues

// 4. Time Logic:
// - Morning → breakfast, cafes, outdoor walks
// - Afternoon → activities, exploring, light meals
// - Evening → dinner, sunset, romantic spots
// - Night → cozy dining, quiet places
// - Late Night → limited options (cafes, drives, desserts)

// 5. Mood Logic:
// - Romantic → intimate, emotional, cozy
// - Adventurous → exciting, active, exploring
// - Cozy → relaxed, comfortable, low-energy
// - Playful → fun, interactive, lighthearted
// - Spontaneous → unique, slightly unexpected ideas

// 6. Vibe Logic:
// - Foodie → prioritize food experiences
// - Artsy → galleries, creative spaces
// - Outdoor → parks, nature, open-air
// - Cozy → indoor, calm environments
// - Luxe → premium/luxury experiences
// - Hidden Gems → less crowded, unique places

// 7. Timeline Rules:
// - Must start exactly from the given Start Time
// - Must be sequential and realistic
// - Each step must include time (e.g., "10:00 AM - ...")
// - Keep steps short and clear (2–4 steps max)

// ----------------------
// OUTPUT FORMAT (STRICT JSON):
// ----------------------

// Return ONLY a valid JSON array:

// [
//   {
//     "city": "${payload.city}",
//     "title": "Short engaging title (max 20 words)",
//     "mood": "${payload.mood}",
//     "vibe": "${payload.vibe}",
//     "time": "${payload.timeOfDay}",
//     "budget": "${payload.budget}",
//     "venues": ["realistic place or type", "another place"],
//     "timeline": [
//       "${payload.startTime} - First activity",
//       "Next time - Next activity"
//     ]
//   }
// ]

// ----------------------
// STRICT RULES:
// ----------------------
// - Return ONLY JSON (no text, no explanation)
// - Do NOT include markdown
// - Do NOT include comments
// - Ensure valid parsable JSON
// - Avoid generic titles like "Nice Date"
// - Avoid repeating the same idea twice
// - Keep suggestions practical and culturally relevant to the city
// `;
    

//   const response = await openai.chat.completions.create({
//     model: "gpt-4.1-mini",
//     messages: [
//       { role: "user", content: prompt }
//     ],
//     temperature: 0.7
//   });

// //   const text:any = response.choices[0].message.content;

//   //parse response to json
//   try {

//     parsedJsonResponse = JSON.parse(response.choices[0].message.content || "[]");
//   } 
//   catch {
//     // throw new Error("Invalid AI response");
//     throw new ApiError(400,"Invalid AI response to parse json.");
//   }

//   return parsedJsonResponse;
// };



// /*
// const prompt = `
// you are an experienced travel guide in the ${payload.city} city.
// Generate 2 dating ideas in JSON format.

// Input:
// City: ${payload.city}
// Mood: ${payload.mood}
// Vibe: ${payload.vibe}
// Time of day: ${payload.timeOfDay}
// Start time: ${payload.startTime}

// Output format:
// [
//   {
//     "city": "string",
//     "title": "string",
//     "mood": "string",
//     "vibe": "string",
//     "time": "string",
//     "venues": ["string"],
//     "timeline": ["string"]
//   }
// ]

// Rules:
// - Return ONLY JSON
// - No explanation
// `;
// */

// /*
// const prompt = `
// You are an expert dating assistant for a couples app.

// Your job is to generate creative, realistic, and emotionally engaging dating ideas based on user preferences.

// INPUT:
// - City: ${payload.city}
// - Mood: ${payload.mood}
// - Vibe: ${payload.vibe}
// - Time of day: ${payload.timeOfDay}
// - Start time: ${payload.startTime}

// INSTRUCTIONS:
// - Generate EXACTLY 2 unique dating suggestions
// - Suggestions must feel natural and realistic for ${payload.city} city
// - Include a mix of indoor/outdoor activities when possible
// - Keep ideas practical (no fantasy or unrealistic places)
// - Timeline should be sequential and time-based
// - Keep each timeline step short and clear

// OUTPUT FORMAT (STRICT JSON ONLY):
// [
//   {
//     "city": "${payload.city}",
//     "title": "Short engaging title",
//     "mood": "${payload.mood}",
//     "vibe": "${payload.vibe}",
//     "time": "${payload.timeOfDay}",
//     "venues": ["realistic place 1", "realistic place 2"],
//     "timeline": [
//       "10:00 AM - ...",
//       "11:00 AM - ..."
//     ]
//   }
// ]

// RULES:
// - Return ONLY valid JSON
// - Do NOT include explanations
// - Do NOT include markdown
// - Do NOT include extra text
// - Ensure JSON is parsable
// `;
// */