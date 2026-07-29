#import "SafariExtensionBridge.h"

#import <SafariServices/SafariServices.h>

void DMLGetSafariExtensionPermission(
    NSString *extensionIdentifier,
    DMLSafariExtensionPermissionHandler completionHandler) {
  [SFSafariExtensionManager
      getStateOfSafariExtensionWithIdentifier:extensionIdentifier
                            completionHandler:^(SFSafariExtensionState *_Nullable state,
                                                NSError *_Nullable error) {
                              BOOL available = error == nil && state != nil;
                              BOOL enabled = available && state.enabled;
                              dispatch_async(dispatch_get_main_queue(), ^{
                                completionHandler(available, enabled);
                              });
                            }];
}

void DMLOpenSafariExtensionPreferences(
    NSString *extensionIdentifier,
    DMLSafariExtensionPreferencesHandler completionHandler) {
  [SFSafariApplication
      showPreferencesForExtensionWithIdentifier:extensionIdentifier
                              completionHandler:^(NSError *_Nullable error) {
                                dispatch_async(dispatch_get_main_queue(), ^{
                                  completionHandler(error == nil);
                                });
                              }];
}
