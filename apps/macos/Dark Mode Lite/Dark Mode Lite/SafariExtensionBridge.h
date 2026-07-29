#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^DMLSafariExtensionPermissionHandler)(BOOL available, BOOL enabled);
typedef void (^DMLSafariExtensionPreferencesHandler)(BOOL succeeded);

FOUNDATION_EXPORT void DMLGetSafariExtensionPermission(
    NSString *extensionIdentifier,
    DMLSafariExtensionPermissionHandler completionHandler);

FOUNDATION_EXPORT void DMLOpenSafariExtensionPreferences(
    NSString *extensionIdentifier,
    DMLSafariExtensionPreferencesHandler completionHandler);

NS_ASSUME_NONNULL_END
