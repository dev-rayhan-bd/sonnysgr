import { Types } from "mongoose";

export interface IPairs {
    resellerId: Types.ObjectId;
    name: string;
    images: string[];
    type: string,
    brand: string;
    styleCode: string;
    details: string;
    color: string;
    variant: {
        gender: string;
        size: string;
        stock: number
    }[];
    askingPrice: number;
    // size: number;
    sneakerAttributes?: {};
    tshirtAttributes?: {};
    condition?: string;
    isVisibleToStore: boolean;
    isShowAskingPrice: boolean;
    isAllowDirectRequest: boolean;
    isSold: boolean;
    pairViewCount: number;
    quantity: number;
    description?: string;

    createdAt: Date;
}

export interface IOfferHistory {
    offeredBy: "Retailer" | "Reseller";
    price: number;
    // note?: string;
    createdAt: Date;
}

export interface IPairRequest {
    resellerId: Types.ObjectId;
    retailerId: Types.ObjectId;
    pairId: Types.ObjectId;
    quantity: number;
    variant: {
        gender: string;
        size: string;
    };
    askingPrice: number;
     offerHistory: IOfferHistory[];
    // unitPrice: number;
    // totalPrice: number;
    status: string;
    note: string;
    validity: {
        validForHours: number;
        from: Date;
        to: Date;
    };
    dealCompletionType: string;
    createdAt: Date;
}