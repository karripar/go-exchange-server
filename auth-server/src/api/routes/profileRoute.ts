import { Router } from "express";
import { addFavorite, removeFavorite, updateProfile } from "../controllers/profileController";
import { authenticate } from "../../middlewares";

/**
 * @apiDefine ProfileGroup Profile
 * User profile management, favorites, and documents
 */

/**
 * @apiDefine token Token is required in the form of Bearer token
 * @apiHeader {String} Authorization Bearer token
 * @apiHeaderExample {json} Header-Example:
 * {
 *  "Authorization": "Bearer <token>"
 * }
 */

/**
 * @apiDefine unauthorized Unauthorized
 * @apiError (401) {String} Unauthorized Missing or invalid authentication token
 * @apiErrorExample {json} Unauthorized:
 * {
 *  "message": "Unauthorized"
 * }
 */

const router = Router();

router.post(
  /**
   * @api {post} /profile/favorites Add favorite
   * @apiName AddFavorite
   * @apiGroup ProfileGroup
   * @apiVersion 1.0.0
   * @apiDescription Add an item to user's favorites
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiBody {String} itemId ID of the item to favorite
   * @apiBody {String} itemType Type of item (story, grant, etc.)
   *
   * @apiSuccess (200) {Object} favorite Added favorite object
   * @apiSuccess (200) {String} favorite.itemId Item ID
   * @apiSuccess (200) {String} favorite.itemType Item type
   * @apiSuccess (200) {String} favorite.addedAt Timestamp when added
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "itemId": "story123",
   *  "itemType": "story",
   *  "addedAt": "2025-11-29T10:00:00.000Z"
   * }
   *
   * @apiError (400) {String} BadRequest Missing required fields
   * @apiErrorExample {json} BadRequest:
   * {
   *  "message": "Missing required fields"
   * }
   *
   * @apiUse unauthorized
   */
  "/favorites",
  authenticate,
  addFavorite
);

router.delete(
  /**
   * @api {delete} /profile/favorites Remove favorite
   * @apiName RemoveFavorite
   * @apiGroup ProfileGroup
   * @apiVersion 1.0.0
   * @apiDescription Remove an item from user's favorites
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiBody {String} itemId ID of the item to unfavorite
   * @apiBody {String} itemType Type of item
   *
   * @apiSuccess (200) {String} message Success message
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "message": "Favorite removed successfully"
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (404) {String} NotFound Favorite not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "Favorite not found"
   * }
   */
  "/favorites",
  authenticate,
  removeFavorite
);


router.put(
  /**
   * @api {put} /profile/:id Update user profile
   * @apiName UpdateProfile
   * @apiGroup ProfileGroup
   * @apiVersion 1.0.0
   * @apiDescription Update user profile information
   * @apiPermission token
   *
   * @apiUse token
   *
   * @apiParam {String} id User's unique ID
   * @apiBody {Object} profile Updated profile data
   * @apiBody {String} [profile.userName] User display name
   * @apiBody {String} [profile.email] Email address
   * @apiBody {String} [profile.bio] User biography
   * @apiBody {Object} [profile.preferences] User preferences
   *
   * @apiSuccess (200) {Object} user Updated user object
   * @apiSuccess (200) {String} user.id User ID
   * @apiSuccess (200) {String} user.userName User name
   * @apiSuccess (200) {String} user.email Email address
   *
   * @apiSuccessExample {json} Success-Response:
   * HTTP/1.1 200 OK
   * {
   *  "id": "123",
   *  "userName": "John Doe",
   *  "email": "john@example.com",
   *  "bio": "Exchange student"
   * }
   *
   * @apiUse unauthorized
   *
   * @apiError (403) {String} Forbidden Cannot update another user's profile
   * @apiErrorExample {json} Forbidden:
   * {
   *  "message": "Cannot update another user's profile"
   * }
   *
   * @apiError (404) {String} NotFound User not found
   * @apiErrorExample {json} NotFound:
   * {
   *  "message": "User not found"
   * }
   */
  "/:id",
  authenticate,
  updateProfile
);

export default router;
