import { model, models, Schema } from "mongoose";
import { IFaq, IHelpAndSupport, IReport, ISettings } from "./Settings.interface";

//help and support model
const HelpAndSupportSchema = new Schema<IHelpAndSupport>({
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    type: { type: String, required: true },
    images: { type: [String], default: [] },
    content: { type: String, required: true },
    status: { type: String, default: "open" },
    isUrgent: { type: Boolean, default: false },
}, { timestamps: true });

const ReportSchema = new Schema<IReport>({
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, required: true },
    images: { type: [String], default: [] },
    content: { type: String, required: true },
    contactMethod: { type: String, required: true },
    isUrgent: { type: Boolean, default: false },
}, { timestamps: true });

//! Privacy and policy
const privacySchema = new Schema<ISettings>(
  {
    description: {
      type: String,
      required: true,
    }
  },
  {
    timestamps: true,
  },
);

//! Privacy and policy
const faqSchema = new Schema<IFaq>(
  {
    question: {
      type: String,
      required: true,
    },
 
    answer: {
      type: String,
      required: true,
    }
  },{
    timestamps: true
  }
);


//! Terms Conditions
const termsAndConditionsSchema = new Schema<ISettings>(
  {
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const HelpAndSupportModel = models.HelpAndSupport || model<IHelpAndSupport>("HelpAndSupport", HelpAndSupportSchema);

const ReportModel = models.Report || model<IReport>("Report", ReportSchema);

const PrivacyPolicyModel = models.PrivacyPolicy || model('PrivacyPolicy', privacySchema);

const TermsConditionsModel = models.TermsConditions || model(
  'TermsConditions',
  termsAndConditionsSchema
);

const FaqModel = models.Faq || model('Faq',faqSchema);

export {
     HelpAndSupportModel,
      ReportModel,
     PrivacyPolicyModel,
     TermsConditionsModel,
     FaqModel
};

// export default SettingsModel;