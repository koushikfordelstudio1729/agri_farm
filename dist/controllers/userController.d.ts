import { GetProfileController, GetUserController, UpdateProfileController, UploadProfileImageController, ChangePasswordController, UpdatePreferencesController, SearchUsersController, FollowUserController, UnfollowUserController, GetFollowersController, GetFollowingController, BlockUserController, UnblockUserController, ReportUserController, DeleteAccountController, ExportDataController, GetUserStatsController } from './userController.types';
export declare class UserController {
    getProfile: GetProfileController;
    getUser: GetUserController;
    updateProfile: UpdateProfileController;
    uploadProfileImage: UploadProfileImageController;
    changePassword: ChangePasswordController;
    updatePreferences: UpdatePreferencesController;
    searchUsers: SearchUsersController;
    getUserStats: GetUserStatsController;
    followUser: FollowUserController;
    unfollowUser: UnfollowUserController;
    getFollowers: GetFollowersController;
    getFollowing: GetFollowingController;
    blockUser: BlockUserController;
    unblockUser: UnblockUserController;
    reportUser: ReportUserController;
    deleteAccount: DeleteAccountController;
    exportData: ExportDataController;
}
declare const _default: UserController;
export default _default;
//# sourceMappingURL=userController.d.ts.map