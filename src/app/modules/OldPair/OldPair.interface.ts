import { Types } from "mongoose";

export interface IOldPair {
    buyerId: Types.ObjectId;
    name: string;
    details: string;
    images: string[];
    price: number;
    offerHistory: IOfferHistory[];
    brand: string;
    size: string;
    condition: string;
    status: string;
    isVisible:boolean;
    visiblityDistance: number //km
}


export interface IOfferHistory {
    offeredBy: "Retailer" | "Buyer";
    price: number;
    // note?: string;
    createdAt: Date;
}