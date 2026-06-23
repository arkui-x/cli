#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Module_namePlugin : NSObject

+ (int)addWithA:(int)a b:(int)b;
+ (void)logWithMsg:(NSString *)msg;
+ (NSString *)getSystemVersion;
+ (NSString *)getFullOSName;
+ (NSString *)getDeviceType;

@end

NS_ASSUME_NONNULL_END
