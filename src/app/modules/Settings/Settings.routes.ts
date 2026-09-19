import express from "express";
import {auth} from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import SettingsValidations from "./Settings.validation";
import SettingsController from "./Settings.controller";


const settingsRouter = express.Router();

//contact us routes
settingsRouter.post(
    "/submit-contact-us",
    // auth(),
    validateRequest(SettingsValidations.helpAndSupportValidation),
    SettingsController.submitHelpAndSupport
);

settingsRouter.get(
    "/get-contact-us",
    // auth(),
    // validateRequest(SettingsValidations.helpAndSupportValidation),
    SettingsController.getHelpAndSupport
);
settingsRouter.delete(
    "/delete-contact-us/:id",
    // auth(),
    // validateRequest(SettingsValidations.helpAndSupportValidation),
    SettingsController.deleteHelpAndSupport
);


//privacy policy
settingsRouter.get(
    "/get-privacy-policy",
    SettingsController.getPrivacyPolicy
);

settingsRouter.patch(
    "/update-privacy-policy/:id",
    validateRequest(SettingsValidations.settingsValidationSchema),
    SettingsController.editPrivacyPolicy
);

//terms and conditions
settingsRouter.get(
    "/get-terms-and-conditions",
    SettingsController.getTermsConditions
);

settingsRouter.patch(
    "/update-terms-and-conditions/:id",
    validateRequest(SettingsValidations.settingsValidationSchema),
    SettingsController.editTermsConditions
);

//faq routes
settingsRouter.post(
    "/create-faq",
    validateRequest(SettingsValidations.faqValidationSchema),
    SettingsController.createFaq
);

settingsRouter.get(
    "/get-all-faq",
    SettingsController.getAllFaq
);

settingsRouter.patch(
    "/edit-faq/:id",
    validateRequest(SettingsValidations.editFaqValidationSchema),
    SettingsController.editFaq
);

settingsRouter.delete(
    "/delete-faq/:id",
    SettingsController.deleteFaq
);  


export default settingsRouter;