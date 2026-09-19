import ApiError from "../../../error/ApiError";
import { IFaq, IHelpAndSupport, ISettings } from "./Settings.interface";
import { FaqModel, HelpAndSupportModel, PrivacyPolicyModel, TermsConditionsModel } from "./Settings.model";

//help and support service
const submitHelpAndSupportService = async (payload: IHelpAndSupport) => {

    const result = await HelpAndSupportModel.create({...payload});

    if (!result) {
        throw new ApiError(500, "Failed to submit help and support request");
    }

    return result;
};

const getHelpAndSupportService = async () => {

    const result = await HelpAndSupportModel.find({}).lean();

    return result;
};

const deleteHelpAndSupportService = async (id: string) => {

    const result = await HelpAndSupportModel.findByIdAndDelete(id);

    if (!result) {
        throw new ApiError(500, "Failed to delete this report.");
    }

    return result;
};


//! Privacy and policy

const getPrivacyPolicy = async () => {

  return await PrivacyPolicyModel.findOne({});

};

const editPrivacyPolicy = async (id: string, payload: ISettings) => {

  
  const result = await PrivacyPolicyModel.findByIdAndUpdate(id , {...payload}, {
    new: true,
    runValidators: true,
  });

  if(!result){
    throw new ApiError(500,"Failed to update privacy policy");
  }

  return result;
};

//terms and consitions

const getTermsConditions = async () => {

    return await TermsConditionsModel.findOne({});

};

const editTermsConditions = async (id: string,payload: ISettings) => {

    
    const result = await TermsConditionsModel.findByIdAndUpdate( id , payload, {
        new: true,
        runValidators: true,
    });

    if(!result){
        throw new ApiError(500,"failed to update Terms and conditions");
    }
    
    return result;
};

//faq service

const createFaqService = async (payload: IFaq) => {

    const result = await FaqModel.create(payload);

    if(!result){
        throw new ApiError(500,"Failed to create FAQ.");
    }

    return result;
}

const getFaqService = async () => {

    const allFaq = await FaqModel.find({}).lean();

    return allFaq;
}

const editFaqService = async (id: string, payload: Partial<IFaq>) => {

    const result = await FaqModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });

    if(!result){
        throw new ApiError(500,"Failed to update FAQ.");
    }

    return result;
}

const deleteFaqService = async (id: string) => {

    const result = await FaqModel.findByIdAndDelete(id);

    if(!result){
        throw new ApiError(500,"Failed to delete FAQ.");
    }

    return result;
}

const SettingsServices = { 
    submitHelpAndSupportService,
    getHelpAndSupportService,
    deleteHelpAndSupportService,
    getPrivacyPolicy,
    editPrivacyPolicy,
    getTermsConditions,
    editTermsConditions,
    createFaqService,
    getFaqService,
    editFaqService,
    deleteFaqService
 };

export default SettingsServices;