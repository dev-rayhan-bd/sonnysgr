import ApiError from "../../../error/ApiError";
import notification from "../../../helper/notification";
import { IJwtPayload } from "../../../interface/jwt.interface";
import deleteOldFile from "../../../utilities/deleteFile";
import {
  ENUM_NOTIFICATION_TYPE,
  ENUM_PAIR_REQUEST_STATUS,
  ENUM_PRODUCT_TYPE,
  ENUM_USER_Type,
} from "../../../utilities/enum";
import { IPairs } from "./Pairs.interface";
import {
  PairRequestModel,
  PairsModel,
  ProductRequestModel,
} from "./Pairs.model";
import PairsValidations from "./Pairs.validation";
import ResellerModel from "../Reseller/Reseller.model";

//add new pairs to the reseller's listing
const addNewPairsToReseller = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[],
  payload: Partial<IPairs>,
) => {
  const { profileId } = userDetails;

  if (!files || files.length === 0) {
    throw new ApiError(400, "At least one pair image is required.");
  }

  const imageUrls = files.map((file) => {
    return `uploads/pair-image/${file.filename}`;
  });

  console.log("product images:", imageUrls);

  const {
    name,
    type,
    brand,
    details,
    variant,
    styleCode,
    askingPrice,
    sneakerAttributes,
    tshirtAttributes,
    description,
    quantity,
    productStatus,
  } = payload;

  // console.log("sneakerAttributes:",sneakerAttributes);
  // console.log("tshirtAttributes:",tshirtAttributes);

  // console.log("Parsed payload:", JSON.parse(sneakerAttributes as string));
  // console.log("Parsed payload:", JSON.parse(tshirtAttributes as string));

  const pairPayload: Record<string, unknown> = {
    name,
    type,
    brand,
    details,
    variant: JSON.parse(variant as any),
    styleCode,
    askingPrice,
    description,
    quantity,
    productStatus,
  };

  // console.log("payload before:", pairPayload);

  if (type === ENUM_PRODUCT_TYPE.SHOES) {
    //  console.log("entered 1");
    pairPayload.sneakerAttributes = JSON.parse(sneakerAttributes as any);
    pairPayload.tshirtAttributes = null;
  }

  if (type === ENUM_PRODUCT_TYPE.CLOTHING) {
    //  console.log("entered 2");
    pairPayload.tshirtAttributes = JSON.parse(tshirtAttributes as any);
    pairPayload.sneakerAttributes = null;
  }

  //  console.log("payload after:", pairPayload);

  const newPairs = new PairsModel({
    resellerId: profileId,
    images: imageUrls || [],
    ...pairPayload,
  });

  await newPairs.save();

  return newPairs;
};

//edit pairs details by the reseller
const editPairsDetails = async (
  userDetails: IJwtPayload,
  pairId: string,
  files: Express.Multer.File[],
  payload: Partial<IPairs>,
) => {
  const { profileId } = userDetails;

  const product = await PairsModel.findOne({
    _id: pairId,
    resellerId: profileId,
  });

  if (!product) {
    throw new ApiError(
      404,
      "Product not found or you do not have permission to edit this product.",
    );
  }

  const existingImages = product.images || [];

  if (files && files.length > 0) {
    const imageUrls = files.map((file) => {
      return `uploads/pair-image/${file.filename}`;
    });
    product.images = imageUrls;
  }

  if (payload?.sneakerAttributes) {
    payload.sneakerAttributes = JSON.parse(payload.sneakerAttributes as any);
  }

  if (payload?.tshirtAttributes) {
    payload.tshirtAttributes = JSON.parse(payload.tshirtAttributes as any);
  }

  if (payload?.variant) {
    payload.variant = JSON.parse(payload.variant as any);
  }

  console.log("edit pair payload", payload);

  Object.assign(product, payload);

  await product.save();

  if (!product) {
    throw new ApiError(500, "Failed to edit product.");
  }

  //delete old images from server if new images are uploaded
  if (files && files.length > 0 && existingImages.length > 0) {
    existingImages.forEach((imageUrl: any) => {
      // Implement your logic to delete the image file from the server
      deleteOldFile(imageUrl);
    });
  }

  return product;
};

const getMyListedPairs = async (
  userDetails: IJwtPayload,
  query: Record<string, unknown>,
) => {
  const { profileId } = userDetails;

  let {
    visiblityStatus,
    soldStatus,
    type,
    page,
    limit,
    brand,
    variant,
    gender,
    size,
    productStatus,
  } = query;

  const filter: Record<string, any> = {
    resellerId: profileId,
  };

  if (visiblityStatus !== undefined) {
    filter.isVisibleToStore = visiblityStatus;
  }

  if (soldStatus !== undefined) {
    filter.isSold = soldStatus;
  }

  if (type) {
    filter.type = type;
  }

  if (brand) {
    filter.brand = brand;
  }

  if (productStatus) {
    filter.productStatus = productStatus;
  }
  const variantFilter: Record<string, any> = {};

  // Resolve gender supporting both 'gender' and legacy 'variant' parameters
  const targetGender = (gender as string) || (variant as string);
  if (targetGender) {
    const formattedGender =
      targetGender.trim().charAt(0).toUpperCase() +
      targetGender.trim().slice(1).toLowerCase();

    const validGenders = ["Men", "Women", "Kids"];
    if (!validGenders.includes(formattedGender)) {
      throw new ApiError(
        400,
        `Invalid gender value. Supported values are: ${validGenders.join(", ")}`,
      );
    }
    variantFilter.gender = formattedGender;
  }

  if (size !== undefined && size !== null) {
    const formattedSize = String(size).trim();
    if (formattedSize.length === 0) {
      throw new ApiError(400, "Size filter value cannot be empty.");
    }
    variantFilter.size = formattedSize;
  }

  if (Object.keys(variantFilter).length > 0) {
    filter.variant = { $elemMatch: variantFilter };
  }

  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  let skip = ((page as number) - 1) * (limit as number);

  const [pairs, totalPairs] = await Promise.all([
    PairsModel.find(filter)
      .select("-sneakerAttributes -tshirtAttributes")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit as number)
      .lean(),

    PairsModel.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(totalPairs / (limit as number));

  const hasNextPage = (page as number) < totalPage ? true : false;

  return {
    meta: {
      page,
      limit,
      total: totalPairs,
      totalPage,
      hasNextPage,
    },
    pairs,
    pairCount: pairs.length,
  };

  // const pairs = await PairsModel.find(filter).lean();

  // return {
  //     pairs,
  //     pairCount: pairs.length
  // };
};

const getSinglePairDetails = async (pairId: string) => {
  // console.log(pairId);

  const pair = await PairsModel.findById(pairId).lean();

  // console.log(pair);

  if (!pair) {
    throw new ApiError(404, "Pair detail not found.");
  }

  return pair;
};

//retailer

//retailer makes request for a pair to the reseller
const makeRequestForPairService = async (
  userDetails: IJwtPayload,
  payload: any,
) => {
  const { profileId } = userDetails;

  const {
    pairId,
    quantity,
    variant,
    askingPrice,
    offerPrice,
    validityHours,
    note,
    dealCompletionType,
    status,
  } = payload;

  console.log("make request payload:", payload);

  const pair: any = await PairsModel.findById(pairId);

  if (!pair) {
    throw new ApiError(404, "Pairs not found to make request.");
  }

  if (pair.resellerId.toString() === profileId) {
    throw new ApiError(400, "You cannot make a request for your own pairs.");
  }

  console.log("pair variant:", pair?.variant);

  //check if the quantity is valid or not
  const pairStock = pair.variant.find(
    (item: any) =>
      item?.size == variant?.size.toString() && item?.gender == variant?.gender,
  );

  if (!pairStock) {
    throw new ApiError(404, "Selected variant not found to request pair.");
  }

  if (pairStock?.stock < quantity) {
    throw new ApiError(
      400,
      "Your selected quantity exceeds pair's current stock.",
    );
  }

  const newPairRequest = new PairRequestModel({
    resellerId: pair?.resellerId,
    retailerId: profileId,
    pairId,
    quantity,
    variant,
    askingPrice: pair?.askingPrice,
    offerHistory: [
      {
        offeredBy: ENUM_USER_Type.RETAILER,
        price: offerPrice,
        // note: note || ""
      },
    ],
    status: ENUM_PAIR_REQUEST_STATUS.PENDING,
    note,
    validity: {
      validForHours: validityHours,
      from: new Date(),
      to: new Date(Date.now() + validityHours * 60 * 60 * 1000),
    },
    // dealCompletionType
  });

  await newPairRequest.save();

  //increment the pairRequestCount of the pair
  pair.pairRequestCount = pair.pairRequestCount + 1;
  await pair.save();

  //send notification to the reseller about the new pair request (this can be implemented using a notification service or system)
  await notification.createNotification({
    toId: pair?.resellerId,
    toModel: "Reseller",
    title: "You have received a pair request.",
    description:
      "You have received a new pair request offer. Kindly response to proceed the deal done.",
    // message?: string;
    type: ENUM_NOTIFICATION_TYPE.NEW_PAIR_REQUEST,
    referenceId: newPairRequest?._id,
    referenceModel: "PairRequestModel",
    metadata: {},
  });

  return newPairRequest;
};

const getAllPairRequestsForRetailer = async (
  userDetails: IJwtPayload,
  query: Record<string, unknown>,
) => {
  const { profileId } = userDetails;

  const { status = "all" } = query;

  let filter: Record<string, any> = { retailerId: profileId };

  if (status !== "all") {
    filter.status = status;
  }

  const pairRequests = await PairRequestModel.find(filter).lean();

  return pairRequests;
};

const getAllResellerWithLowStockShoes = async () => {
  //get all reseller with shoe
};

const getResellerDetailWithShoes = async () => {
  //when this api is being called
  //analytics model will be excuted here.
};

//reseller

//get all pair requests for the reseller
const getAllPairRequestsForReseller = async (
  userDetails: IJwtPayload,
  query: Record<string, unknown>,
) => {
  const { profileId } = userDetails;

  let { status = "all", type, page, limit } = query;

  let filter: Record<string, any> = { resellerId: profileId };

  if (status !== "all") {
    filter.status = status;
  }

  if (type) {
    filter.type = type;
  }

  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  let skip = ((page as number) - 1) * (limit as number);

  const [pairs, totalPairs] = await Promise.all([
    PairRequestModel.find(filter)
      .populate({
        path: "retailerId",
        select: "name image address averageRating badge",
      })
      .populate({
        path: "pairId",
        select: "name images  sneakerAttributes tshirtAttributes",
      })
      .select("variant askingPrice  status note createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit as number)
      .lean(),

    PairRequestModel.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(totalPairs / (limit as number));

  const hasNextPage = (page as number) < totalPage ? true : false;

  return {
    meta: {
      page,
      limit,
      total: totalPairs,
      totalPage,
      hasNextPage,
    },
    pairs,
    pairCount: pairs.length,
  };

  // const pairRequests = await PairRequestModel.find(filter).lean();

  // return pairRequests;
};

const getSInglePairRequestService = async (pairRequestId: string) => {
  console.log(pairRequestId);
  let request: any = await PairRequestModel.findById(pairRequestId).lean();
  console.log(request);

  if (!request) {
    request = await ProductRequestModel.findById(pairRequestId)
      .populate({
        path: "retailerId",
        select: "name image address averageRating badge",
      })
      .populate({
        path: "resellerId",
        select: "name image address badge",
      })
      .lean();
  }

  if (!request) {
    throw new ApiError(404, "Request not found.");
  }

  return request;
};

const acceptPairRequest = async (
  userDetails: IJwtPayload,
  pairRequestId: string,
) => {
  const { profileId } = userDetails;

  const pairRequest: any = await PairRequestModel.findById(pairRequestId);

  // console.log("pair request:",pairRequest);

  if (!pairRequest) {
    throw new ApiError(404, "Pair request not found to accept.");
  }

  if (pairRequest.resellerId.toString() !== profileId) {
    throw new ApiError(403, "You can not accept this pair request.");
  }

  //check already accepted or rejected
  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.ACCEPTED) {
    throw new ApiError(400, "You have already accepted the pair request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.REJECTED) {
    throw new ApiError(400, "You can not accept a already rejected request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.CANCELLED) {
    throw new ApiError(400, "You can not accept a already cancelled request.");
  }

  //check before accept that the stock is available
  const pair = await PairsModel.findById(pairRequest?.pairId);

  if (!pair) {
    throw new ApiError(404, "Pair not found.");
  }

  //check pair stock is available
  const variant = pair.variant.find(
    (item: any) =>
      item?.size == pairRequest?.variant?.size.toString() &&
      item?.gender == pairRequest?.variant?.gender,
  );

  if (!variant) {
    throw new ApiError(404, "Pair stock not found.");
  }

  if (variant?.stock < pairRequest?.quantity) {
    throw new ApiError(400, "Pair stock is not available.");
  }

  //adjust the quantity of the pairs based on the accepted request
  const adjustPairStock = await PairsModel.findOneAndUpdate(
    {
      _id: pairRequest?.pairId,
      variant: {
        $elemMatch: {
          gender: pairRequest?.variant?.gender,
          size: pairRequest?.variant?.size,
          stock: { $gte: pairRequest?.quantity },
        },
      },
    },
    {
      $inc: {
        "variant.$.stock": -pairRequest?.quantity,
      },
    },
    { new: true },
  );

  // console.log("adjusted pair stock:",adjustPairStock);

  if (!adjustPairStock) {
    throw new ApiError(400, "You do not have enough stock for this request.");
  }

  pairRequest.status = ENUM_PAIR_REQUEST_STATUS.ACCEPTED;
  await pairRequest.save();

  //send notification to the retailer about the acceptance of their pair request (this can be implemented using a notification service or system)
  //notification to reseller
  await Promise.all([
    notification.createNotification({
      toId: profileId,
      toModel: "Reseller",
      title: "You have accepted a pair request.",
      description: "You have acepted a pair request offer",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.ACCEPTED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),

    //notification to retailer
    notification.createNotification({
      toId: pairRequest?.retailerId,
      toModel: "Retailer",
      title: "Your requested pair is accepted.",
      description: "Reseller has accepted your pair request offer.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.ACCEPTED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),
  ]);

  return {
    status: pairRequest?.status,
    price: pairRequest?.askingPrice,
  };
};

const cancelPairRequest = async (
  userDetails: IJwtPayload,
  pairRequestId: string,
) => {
  const { profileId } = userDetails;

  const pairRequest = await PairRequestModel.findById(pairRequestId);

  if (!pairRequest) {
    throw new ApiError(404, "Pair request not found to cancel.");
  }

  if (pairRequest.resellerId.toString() !== profileId) {
    throw new ApiError(403, "You can not reject this pair request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.CANCELLED) {
    throw new ApiError(400, "You have already cancelled the pair request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.REJECTED) {
    throw new ApiError(400, "You can not cancel a already rejected request.");
  }

  pairRequest.status = ENUM_PAIR_REQUEST_STATUS.CANCELLED;
  await pairRequest.save();

  //add stock back to the pair
  const addStockBack = await PairsModel.findOneAndUpdate(
    {
      _id: pairRequest?.pairId,
      variant: {
        $elemMatch: {
          gender: pairRequest?.variant?.gender,
          size: pairRequest?.variant?.size,
        },
      },
    },
    {
      $inc: {
        "variant.$.stock": pairRequest?.quantity,
      },
    },
    { new: true },
  );

  if (!addStockBack) {
    throw new ApiError(400, "Failed to add stock back to the pair");
  }

  //notification to reseller
  await Promise.all([
    notification.createNotification({
      toId: profileId,
      toModel: "Reseller",
      title: "You have cancelled a pair request.",
      description: "You have cancelled a pair request offer",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.CANCELLED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),

    //notification to retailer
    notification.createNotification({
      toId: pairRequest?.retailerId,
      toModel: "Retailer",
      title: "Your requested pair is cancelled.",
      description: "Reseller has cancelled your pair request offer.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.CANCELLED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),
  ]);

  return {
    status: pairRequest?.status,
    price: pairRequest?.askingPrice,
  };
};

const rejectPairRequest = async (
  userDetails: IJwtPayload,
  pairRequestId: string,
) => {
  const { profileId } = userDetails;

  const pairRequest = await PairRequestModel.findById(pairRequestId);

  if (!pairRequest) {
    throw new ApiError(404, "Pair request not found to cancel.");
  }

  if (pairRequest.resellerId.toString() !== profileId) {
    throw new ApiError(403, "You can not reject this pair request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.REJECTED) {
    throw new ApiError(400, "You have already rejected the pair request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.ACCEPTED) {
    throw new ApiError(400, "You can not reject a already accepted request.");
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.CANCELLED) {
    throw new ApiError(400, "You can not reject a already cancelled request.");
  }

  pairRequest.status = ENUM_PAIR_REQUEST_STATUS.REJECTED;
  await pairRequest.save();

  //notification to reseller
  await Promise.all([
    notification.createNotification({
      toId: profileId,
      toModel: "Reseller",
      title: "You have rejected a pair request.",
      description: "You have rejected a pair request offer",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.REJECTED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),

    //notification to retailer
    notification.createNotification({
      toId: pairRequest?.retailerId,
      toModel: "Retailer",
      title: "Your requested pair is rejected.",
      description: "Reseller has rejected your pair request offer.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.REJECTED_PAIR_REQUEST,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),
  ]);

  return {
    status: pairRequest?.status,
    price: pairRequest?.askingPrice,
  };
};

const proposeCounterOfferToPairRequest = async (
  userDetails: IJwtPayload,
  payload: any,
) => {
  const { profileId, authId } = userDetails;

  // const auth:any = AuthModel.findById(authId).select("role").lean();

  const { pairRequestId, offerPrice, dealCompletionType } = payload;

  const pairRequest = await PairRequestModel.findById(pairRequestId);

  if (!pairRequest) {
    throw new ApiError(404, "Pair request not found to propose counter offer.");
  }

  if (pairRequest?.resellerId.toString() !== profileId) {
    throw new ApiError(
      403,
      "You can not make counter offer of this pair request.",
    );
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.ACCEPTED) {
    throw new ApiError(
      400,
      "You can not make counter offer of this accepted pair request.",
    );
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.REJECTED) {
    throw new ApiError(
      400,
      "You can not make counter offer of this rejected pair request.",
    );
  }

  if (pairRequest?.status === ENUM_PAIR_REQUEST_STATUS.CANCELLED) {
    throw new ApiError(
      400,
      "You can not make counter offer of this cancelled pair request.",
    );
  }

  pairRequest.status = ENUM_PAIR_REQUEST_STATUS.COUNTER;

  pairRequest.offerHistory.push({
    offeredBy: ENUM_USER_Type.RESELLER,
    price: offerPrice,
    // note: payload.note || ""
  });

  if (dealCompletionType) pairRequest.dealCompletionType = dealCompletionType;

  await pairRequest.save();

  //notification to reseller
  await Promise.all([
    notification.createNotification({
      toId: profileId,
      toModel: "Reseller",
      title: "You have proposed a counter offer for a pair request.",
      description: "You have proposed a counter offer for a pair request.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.COUNTER_OFFER,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),

    //notification to retailer
    notification.createNotification({
      toId: pairRequest?.retailerId,
      toModel: "Retailer",
      title: "You have received a counter offer for your pair request.",
      description:
        "Reseller has proposed a counter offer for your pair request.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.COUNTER_OFFER,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),
  ]);

  return {
    status: pairRequest?.status,
    price: offerPrice,
  };
};

const retailerProposeCounterOfferToPairRequest = async (
  userDetails: IJwtPayload,
  payload: any,
) => {
  const { profileId, authId } = userDetails;

  // const auth:any = AuthModel.findById(authId).select("role").lean();

  const { pairRequestId, offerPrice, dealCompletionType } = payload;

  const pairRequest = await PairRequestModel.findById(pairRequestId);

  if (!pairRequest) {
    throw new ApiError(404, "Pair request not found to propose counter offer.");
  }

  if (pairRequest?.retailerId.toString() !== profileId) {
    throw new ApiError(
      403,
      "You can not make counter offer of this pair request.",
    );
  }

  pairRequest.status = ENUM_PAIR_REQUEST_STATUS.COUNTER;

  pairRequest.offerHistory.push({
    offeredBy: ENUM_USER_Type.RETAILER,
    price: offerPrice,
    // note: payload.note || ""
  });

  if (dealCompletionType) pairRequest.dealCompletionType = dealCompletionType;

  await pairRequest.save();

  //notification to reseller
  await Promise.all([
    notification.createNotification({
      toId: profileId,
      toModel: "Reseller",
      title: "You have received a counter offer for a pair request.",
      description: "You have received a counter offer for a pair request.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.COUNTER_OFFER,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),

    //notification to retailer
    notification.createNotification({
      toId: pairRequest?.retailerId,
      toModel: "Retailer",
      title: "You have proposed a counter offer for your pair request.",
      description: "You have proposed a counter offer for your pair request.",
      // message?: string;
      type: ENUM_NOTIFICATION_TYPE.COUNTER_OFFER,
      referenceId: pairRequest._id,
      referenceModel: "PairRequestModel",
      metadata: {},
    }),
  ]);

  return {
    status: pairRequest?.status,
    price: offerPrice,
  };
};

const createProductRequest = async (
  userDetails: IJwtPayload,
  files: Express.Multer.File[],
  payload: any,
) => {
  const { profileId, role } = userDetails;

  // 1. Authorization Check: Only Retailer can submit a request
  if (role !== ENUM_USER_Type.RETAILER) {
    throw new ApiError(
      403,
      "Only retailers are authorized to submit product requests.",
    );
  }

  // Handle map aliases: brand/brannd, styleCode/style-code/sku
  const resellerId = payload.resellerId;
  if (!resellerId) {
    throw new ApiError(400, "Reseller ID is required.");
  }
  const name = payload.name;
  const brand = payload.brand || payload.brannd;
  let type = payload.type;
  if (type === "Cloths") {
    type = ENUM_PRODUCT_TYPE.CLOTHING;
  }
  const color = payload.color || "";
  const styleCode = payload.styleCode || payload["style-code/sku"] || "";
  const note = payload.note || "";

  // Parse variant if it is a stringified JSON array
  let variant = payload.variant;
  if (typeof variant === "string") {
    try {
      variant = JSON.parse(variant);
    } catch (e) {
      throw new ApiError(
        400,
        "Invalid format for variant. Must be a valid JSON array.",
      );
    }
  }

  // Process files
  const imageUrls = (files || []).map((file) => {
    return `uploads/pair-image/${file.filename}`;
  });

  // Prepare data for validation
  const dataToValidate = {
    resellerId,
    type,
    name,
    brand,
    color,
    styleCode,
    variant,
    note,
  };

  // Perform validation using Zod
  const validationResult =
    PairsValidations.createProductRequestValidationSchema.safeParse({
      body: dataToValidate,
    });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues
      .map((err: any) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    throw new ApiError(400, `Validation Error: ${errorMessages}`);
  }

  const validatedData = validationResult.data.body;

  let resolvedResellerId = validatedData.resellerId;
  let reseller = await ResellerModel.findById(validatedData.resellerId);
  if (!reseller) {
    reseller = await ResellerModel.findOne({ auth: validatedData.resellerId });
  }

  if (!reseller) {
    throw new ApiError(404, "Reseller not found.");
  }
  resolvedResellerId = reseller._id;

  // Normalize gender to Capitalized
  const formattedVariants = validatedData.variant.map((v: any) => {
    const gender =
      v.gender.trim().charAt(0).toUpperCase() +
      v.gender.trim().slice(1).toLowerCase();
    return {
      gender,
      size: v.size,
      quantity: Number(v.quantity),
      offerPrice: Number(v.offerPrice),
    };
  });

  // Save to database
  const productRequest = new ProductRequestModel({
    retailerId: profileId,
    resellerId: resolvedResellerId,
    type:
      validatedData.type === "Cloths"
        ? ENUM_PRODUCT_TYPE.CLOTHING
        : validatedData.type,
    images: imageUrls,
    name: validatedData.name,
    brand: validatedData.brand,
    color: validatedData.color,
    styleCode: validatedData.styleCode,
    variant: formattedVariants,
    note: validatedData.note,
  });

  await productRequest.save();
  return productRequest;
};

const getAllProductRequests = async (
  userDetails: IJwtPayload,
  query: Record<string, unknown>,
) => {
  const { profileId, authId, role } = userDetails;

  // 1. Authorization: Only Retailer and Reseller can retrieve
  if (role !== ENUM_USER_Type.RETAILER && role !== ENUM_USER_Type.RESELLER) {
    throw new ApiError(
      403,
      "You do not have permission to view product requests.",
    );
  }

  let { page, limit, brand, type, resellerId } = query;

  const filter: Record<string, any> = {};

  if (role === ENUM_USER_Type.RETAILER) {
    filter.retailerId = profileId;
  }

  if (role === ENUM_USER_Type.RESELLER) {
    let resolvedResellerId = profileId;
    const resellerProfile = await ResellerModel.findById(profileId);
    if (!resellerProfile) {
      const resellerByAuth = await ResellerModel.findOne({
        auth: authId || profileId,
      });
      if (resellerByAuth) {
        resolvedResellerId = resellerByAuth._id.toString();
      }
    }
    filter.resellerId = resolvedResellerId;
  }

  if (resellerId) {
    let resolvedResellerId = resellerId;
    const resellerProfile = await ResellerModel.findById(resellerId);
    if (!resellerProfile) {
      const resellerByAuth = await ResellerModel.findOne({ auth: resellerId });
      if (resellerByAuth) {
        resolvedResellerId = resellerByAuth._id.toString();
      }
    }
    filter.resellerId = resolvedResellerId;
  }

  if (brand) {
    filter.brand = brand;
  }

  if (type) {
    filter.type = type;
  }

  page = parseInt(page as any) || 1;
  limit = parseInt(limit as any) || 10;
  let skip = ((page as number) - 1) * (limit as number);

  const [productRequests, totalRequests] = await Promise.all([
    ProductRequestModel.find(filter)
      .populate({
        path: "retailerId",
        select: "name image address averageRating badge",
      })
      .populate({
        path: "resellerId",
        select: "name image address badge",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit as number)
      .lean(),

    ProductRequestModel.countDocuments(filter),
  ]);

  const totalPage = Math.ceil(totalRequests / (limit as number));
  const hasNextPage = (page as number) < totalPage;

  return {
    meta: {
      page: page as number,
      limit: limit as number,
      total: totalRequests,
      totalPage,
      hasNextPage,
    },
    productRequests,
    count: productRequests.length,
  };
};

const updateProductRequestStatus = async (
  userDetails: IJwtPayload,
  id: string,
  payload: {
    status: "Accepted" | "Declined" | "Countered";
    counterOfferPrice?: number;
  },
) => {
  const { profileId, authId, role } = userDetails;

  // 1. Authorization Check: Only Reseller can update status
  if (role !== ENUM_USER_Type.RESELLER) {
    throw new ApiError(
      403,
      "Only resellers are authorized to update product request status.",
    );
  }

  // Find the product request
  const productRequest = await ProductRequestModel.findById(id);
  if (!productRequest) {
    throw new ApiError(404, "Product request not found.");
  }

  // Resolve reseller's profile ID
  let resolvedResellerId = profileId;
  const resellerProfile = await ResellerModel.findById(profileId);
  if (!resellerProfile) {
    const resellerByAuth = await ResellerModel.findOne({
      auth: authId || profileId,
    });
    if (resellerByAuth) {
      resolvedResellerId = resellerByAuth._id.toString();
    }
  }

  // Ensure this reseller is assigned to the request
  if (productRequest.resellerId.toString() !== resolvedResellerId.toString()) {
    throw new ApiError(
      403,
      "You do not have permission to update this product request.",
    );
  }

  const { status, counterOfferPrice } = payload;

  if (status === "Countered") {
    if (counterOfferPrice === undefined || counterOfferPrice === null) {
      throw new ApiError(
        400,
        "Counter offer price is required for Countered status.",
      );
    }
    // Append to offer history
    if (!productRequest.offerHistory) {
      productRequest.offerHistory = [];
    }
    productRequest.offerHistory.push({
      offeredBy: "Reseller",
      price: counterOfferPrice,
      createdAt: new Date(),
    });
  }

  productRequest.status = status;
  await productRequest.save();

  return productRequest;
};

const PairsServices = {
  addNewPairsToReseller,
  editPairsDetails,
  getMyListedPairs,
  getSinglePairDetails,

  makeRequestForPairService,
  getAllPairRequestsForRetailer,
  retailerProposeCounterOfferToPairRequest,

  getAllPairRequestsForReseller,
  getSInglePairRequestService,
  acceptPairRequest,
  cancelPairRequest,
  rejectPairRequest,
  proposeCounterOfferToPairRequest,
  createProductRequest,
  getAllProductRequests,
  updateProductRequestStatus,
};

export default PairsServices;
