import express from "express";
import { body } from "express-validator";
import { validationErrors, authenticate } from "../../middlewares";
import {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
  reorderContacts,
} from "../controllers/adminContactController";

const router = express.Router();

/**
 * @apiDefine AdminContactGroup Admin Contact
 * APIs for managing admin contact information displayed on the Contact page.
 */

/**
 * @apiDefine unauthorized Unauthorized
 * @apiError (401 Unauthorized) Unauthorized Missing or invalid authentication token.
 * @apiErrorExample {json} Unauthorized-Response:
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "message": "Unauthorized"
 *     }
 */

/**
 * @apiDefine token Authentication required in the form of Bearer token in Authorization header.
 * @apiHeader {String} Authorization Bearer token.
 */

router
  .get(
    /**
     * @api {get} /contact/contacts Get all admin contacts
     * @apiName GetAdminContacts
     * @apiGroup AdminContactGroup
     * @apiVersion 1.0.0
     *
     * @apiDescription Retrieves all admin contact entries.
     * @apiPermission none
     *
     * @apiSuccess {Object[]} contacts List of admin contacts.
     * @apiSuccess {String} contacts._id Unique ID of the contact.
     * @apiSuccess {String} contacts.name Full name of the admin contact.
     * @apiSuccess {String} contacts.title Title or role of the admin.
     * @apiSuccess {String} contacts.email Contact email address.
     * @apiSuccess {String} contacts.createdAt Timestamp of creation.
     *
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       "contacts": [
     *         {
     *           "_id": "unique_contact_id",
     *           "name": "John Doe",
     *           "title": "Exchange Coordinator",
     *           "email": "john@example.com",
     *           "createdAt": "2024-01-01T00:00:00.000Z"
     *         }
     *       ]
     *     }
     *
     * @apiError (500 Internal Server Error) InternalServerError Server error while processing the request.
     * @apiErrorExample {json} InternalServerError-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "message": "Failed to fetch contacts"
     *     }
     */
    "/contacts",
    getContacts
  )
  .post(
    /**
     * @api {post} /contact/contacts Add a new admin contact
     * @apiName AddAdminContact
     * @apiGroup AdminContactGroup
     * @apiVersion 1.0.0
     *
     * @apiDescription Adds a new admin contact entry. Only accessible to admins.
     * @apiPermission token
     *
     * @apiBody {String} name Full name of the admin contact.
     * @apiBody {String} title Title or role of the admin.
     * @apiBody {String} email Contact email address.
     *
     * @apiSuccess {String} message Success message indicating that the contact was added successfully.
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 201 Created
     *     {
     *       "message": "Admin contact added successfully",
     *       "contact": {
     *         "_id": "unique_contact_id",
     *         "name": "John Doe",
     *         "title": "Coordinator",
     *         "email": "john@example.com"
     *       }
     *     }
     *
     * @apiError (400 Bad Request) BadRequest Missing required fields.
     * @apiErrorExample {json} BadRequest-Response:
     *     HTTP/1.1 400 Bad Request
     *     {
     *       "message": "All fields are required"
     *     }
     *
     * @apiError (401 Unauthorized) Unauthorized Missing or invalid authentication token.
     * @apiErrorExample {json} Unauthorized-Response:
     *     HTTP/1.1 401 Unauthorized
     *     {
     *       "message": "Unauthorized"
     *     }
     *
     * @apiError (403 Forbidden) Forbidden User not authorized to perform this action.
     * @apiErrorExample {json} Forbidden-Response:
     *     HTTP/1.1 403 Forbidden
     *     {
     *       "message": "Forbidden, not an admin"
     *     }
     *
     * @apiError (500 Internal Server Error) InternalServerError Server error while processing the request.
     * @apiErrorExample {json} InternalServerError-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "message": "Failed to add contact"
     *     }
     */
    "/contacts",
    body("name").isString().withMessage("Name must be a string").isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
    body("title").isString().withMessage("Title must be a string").isLength({ min: 2, max: 100 }).withMessage("Title must be between 5 and 100 characters"),
    body("email").isEmail().withMessage("Email must be a valid email address").isLength({ max: 100 }).withMessage("Email must be at most 100 characters"),
    validationErrors,
    authenticate,
    addContact
  )
  .put(
    /**
     * @api {put} /contact/contacts/:id Update an admin contact
     * @apiName UpdateAdminContact
     * @apiGroup AdminContactGroup
     * @apiVersion 1.0.0
     *
     * @apiDescription Updates an existing admin contact by ID. Only accessible to admins.
     * @apiPermission token
     *
     * @apiParam {String} id Unique ID of the contact to update.
     *
     * @apiBody {String} [name] Updated name of the contact.
     * @apiBody {String} [title] Updated title or role of the contact.
     * @apiBody {String} [email] Updated email address.
     *
     * @apiSuccess {String} message Success message indicating that the contact was updated successfully.
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       "message": "Contact updated successfully",
     *       "contact": {
     *         "_id": "unique_contact_id",
     *         "name": "Jane Doe",
     *         "title": "Program Advisor",
     *         "email": "jane@example.com"
     *       }
     *     }
     *
     * @apiError (404 Not Found) NotFound Contact not found.
     * @apiErrorExample {json} NotFound-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "message": "Contact not found"
     *     }
     *
     * @apiError (403 Forbidden) Forbidden User not authorized to perform this action.
     * @apiErrorExample {json} Forbidden-Response:
     *     HTTP/1.1 403 Forbidden
     *     {
     *       "message": "Forbidden, not an admin"
     *     }
     *
     * @apiError (500 Internal Server Error) InternalServerError Server error while processing the request.
     * @apiErrorExample {json} InternalServerError-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "message": "Failed to update contact"
     *     }
     */
    "/contacts/:id",
    body("name").optional().isString().withMessage("Name must be a string"),
    body("title").optional().isString().withMessage("Title must be a string"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Email must be a valid email address"),
    validationErrors,
    authenticate,
    updateContact
  )
  .delete(
    /**
     * @api {delete} /contact/contacts/:id Delete an admin contact
     * @apiName DeleteAdminContact
     * @apiGroup AdminContactGroup
     * @apiVersion 1.0.0
     *
     * @apiDescription Deletes a specific admin contact by its ID. Only accessible to admins.
     * @apiPermission token
     *
     * @apiParam {String} id Unique ID of the contact to delete.
     *
     * @apiSuccess {String} message Success message indicating that the contact was deleted successfully.
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       "success": true,
     *       "message": "Contact deleted successfully"
     *     }
     *
     * @apiError (404 Not Found) NotFound Contact not found.
     * @apiErrorExample {json} NotFound-Response:
     *     HTTP/1.1 404 Not Found
     *     {
     *       "message": "Contact not found"
     *     }
     *
     * @apiError (401 Unauthorized) Unauthorized Missing or invalid authentication token.
     * @apiErrorExample {json} Unauthorized-Response:
     *     HTTP/1.1 401 Unauthorized
     *     {
     *       "message": "Unauthorized"
     *     }
     *
     * @apiError (403 Forbidden) Forbidden User not authorized to perform this action.
     * @apiErrorExample {json} Forbidden-Response:
     *     HTTP/1.1 403 Forbidden
     *     {
     *       "message": "Forbidden, not an admin"
     *     }
     *
     * @apiError (500 Internal Server Error) InternalServerError Server error while processing the request.
     * @apiErrorExample {json} InternalServerError-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "message": "Failed to delete contact"
     *     }
     */
    "/contacts/:id",
    authenticate,
    deleteContact
  );

router.post(
    /**
     * @api {post} /contact/contacts/reorder Reorder admin contacts
     * @apiName ReorderAdminContacts
     * @apiGroup AdminContactGroup
     * @apiVersion 1.0.0
     *
     * @apiDescription Reorders admin contacts based on provided list of IDs. Only accessible to admins.
     * @apiPermission token
     *
     * @apiBody {String[]} orderedIds Array of contact IDs in the desired order.
     *
     * @apiSuccess {String} message Success message indicating that the contacts were reordered successfully.
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *       "message": "Contacts reordered successfully"
     *     }
     *
     * @apiError (400 Bad Request) BadRequest Invalid input data.
     * @apiErrorExample {json} BadRequest-Response:
     *    HTTP/1.1 400 Bad Request
     *   {
     *    "message": "Invalid ordered IDs array"
     *  }
     *
     * @apiError (401 Unauthorized) Unauthorized Missing or invalid authentication token.
     * @apiErrorExample {json} Unauthorized-Response:
     *     HTTP/1.1 401 Unauthorized
     *     {
     *       "message": "Unauthorized"
     *     }
     *
     * @apiError (403 Forbidden) Forbidden User not authorized to perform this action.
     * @apiErrorExample {json} Forbidden-Response:
     *     HTTP/1.1 403 Forbidden
     *     {
     *       "message": "Forbidden, not an admin"
     *     }
     * @apiError (500 Internal Server Error) InternalServerError Server error while processing the request.
     * @apiErrorExample {json} InternalServerError-Response:
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "message": "Failed to reorder contacts"
     *     }
     */
    "/contacts/reorder",
    body("orderedIds").isArray({ min: 1 }).withMessage("orderedIds must be a non-empty array"),
    validationErrors,
    authenticate,
    reorderContacts
);

export default router;
