---
title: "React Native New Architecture Migration Guide"
description: "A practical guide to migrating a React Native app to the New Architecture — Fabric, TurboModules, JSI, and codegen — with a staged rollout plan, interop-layer strategy, and rollback path."
category: "frontend"
technology: "react-native"
difficulty: "advanced"
type: "guide"
locale: "en"
---

# React Native New Architecture Migration Guide

## Introduction

The New Architecture replaces React Native's asynchronous JSON bridge with a set of C++ interfaces that JavaScript can call directly. It is not a single feature but four cooperating pieces: **JSI** (JavaScript Interface), which lets JavaScript hold references to C++ host objects and invoke their methods without serialization; **TurboModules**, the lazy, type-safe replacement for the legacy native module system; **Fabric**, the new rendering pipeline that mounts shadow nodes on the native side instead of shipping view descriptions across the bridge; and **codegen**, the build-time tool that turns TypeScript or Flow specs into the C++ and Java/Objective-C glue that binds the other three together.

The migration matters because the legacy bridge is on a deprecation path. Recent React Native releases ship the New Architecture enabled by default, and the bridge-backed APIs that thousands of third-party libraries depend on are being removed rather than merely discouraged. Applications that postpone migration accumulate a growing tail of dependencies that have already dropped legacy support, which is how a "later" upgrade turns into a multi-week emergency.

This guide is written for teams migrating a **production brownfield app** — one with existing native modules, a mix of third-party libraries of unknown maturity, and no appetite for a freeze on feature work. It treats migration as a staged cutover with a measurable rollback point at every step, rather than a one-shot rewrite. The same sequence applies to greenfield apps, minus the interop-layer steps.

## Best Practices

### Treat the Migration as a Staged Cutover, Not a Rewrite

The most expensive failure mode is a branch that enables the New Architecture, breaks two hundred screens, and cannot be merged for a month. Instead, land the migration in increments that each keep the app shippable: upgrade the toolchain first, then enable codegen with zero behavioral change, then convert one native module, then one screen, then the rest. Every increment should be mergeable and testable on its own. The New Architecture supports running interop-wrapped legacy modules alongside converted ones, which is precisely what makes incremental delivery possible — use that capability instead of racing to convert everything at once.

### Inventory Native Dependencies Before Touching Code

You cannot plan the work without knowing which of your dependencies are already New Architecture compatible. Audit every native package — not just your direct dependencies, but transitive ones, because a single unmaintained transitive dependency can block the cutover. Classify each into four buckets: fully Fabric/TurboModule ready, compatible through the interop layer, JavaScript-only (irrelevant to the migration), or unsupported with no known replacement. The fourth bucket drives your timeline; start looking for replacements or forks on day one, because that is where schedule risk concentrates.

### Let Codegen Own the Native Interface

Hand-written bridge headers are the single largest source of migration bugs. Under the New Architecture the native interface is generated from a spec file, so a mismatch between the JavaScript signature and the native implementation becomes a compile-time error instead of a runtime crash on a user's device. Write specs in TypeScript (`Native*.ts`) for TurboModules and in the `codegenNativeComponent` form for Fabric components, and treat the generated output as read-only build artifacts that are never committed. When a native module needs a new method, change the spec first and let codegen fail loudly until both platform implementations catch up.

### Keep the Interop Layer as a Temporary Scaffold, Not a Home

The interop layer registers legacy modules and view managers so they keep functioning under the New Architecture. It is a bridge across the migration, not a destination: interop-wrapped calls still pay some serialization cost, they cannot participate in the synchronous JSI fast path, and they will not survive the eventual removal of legacy support. Set an explicit deadline for reaching zero interop dependencies and track the count of interop-wrapped modules as a burn-down metric. A team that finishes the migration with the interop layer still populated has done the expensive part and kept none of the payoff.

### Fix Synchronous Native Calls Deliberately

The legacy bridge is overwhelmingly asynchronous, but a handful of APIs run synchronously — `requireNativeComponent` lookups, several `NativeModules` constant reads, and anything using `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`. Under JSI, synchronous calls become genuinely cheap, so the temptation is to make everything synchronous. Resist it for anything that touches disk, network, or the main thread: a synchronous call blocks the JavaScript thread for its full duration, whereas the same call asynchronously overlapped with rendering. Convert to synchronous only for small, in-memory lookups, and document the reason next to each one.

### Budget for Threading and Lifecycle Differences

Fabric mounts views on the native UI thread with its own layout pass, and TurboModules can be invoked from any JavaScript runtime, including multiple runtimes when you use `react-native-macos`, bridgeless mode, or embedded React instances. Code that silently assumed "one runtime, one thread, one bridge lifecycle" starts failing in ways that look unrelated: callbacks firing after a screen unmounts, layout measurements differing by a frame, event emitters leaking across instances. Audit native code for shared mutable state and for work started in a module constructor, then move it behind explicit lifecycle hooks.

### Gate Rollout Behind Flags and Measure

Ship the migrated app with a runtime switch that can fall back to the legacy path for a subset of users, and watch the metrics that actually reflect the change: cold-start time, time-to-interactive, JS and UI thread frame rates during scrolling, memory high-water mark, and crash-free session rate. Fabric and TurboModules typically reduce startup cost and bridge-related jank, but they can also expose pre-existing native bugs that the old pipeline masked. A flagged rollout with a comparison cohort turns a scary cutover into an experiment you can stop.

## Implementation Steps

### Step 1: Establish the Baseline and Inventory

Record what you are migrating from before you change anything. Capture the exact React Native version, the Hermes setting, and the current `Podfile.lock` / `gradle.lockfile` contents, then snapshot release-build performance on a physical mid-tier device so the post-migration comparison is honest.

```bash
node -e "console.log(require('react-native/package.json').version)"
npx react-native config > /tmp/rn-config-before.json
```

The generated config file is your dependency inventory: it lists every native module, view manager, and the platform projects React Native knows about. Classify each entry into ready, interop-compatible, JavaScript-only, or unsupported, and write the classification into a tracked table in your repository so the burn-down is visible to the whole team.

```text
Dependency              Type            Status        Action
────────────────────────────────────────────────────────────────
react-native-reanimated native module   ready         none
react-native-mmkv       native module   ready         none
react-native-camera     view manager    interop       plan replacement (Q3)
legacy-analytics-sdk    native module   unsupported   fork or vendor
react-native-svg        view manager    ready         none
date-fns                js only         n/a           none
```

### Step 2: Upgrade the Toolchain Before Enabling Anything

Migrations fail disproportionately at the toolchain stage, so isolate it. Upgrade React Native, then CocoaPods, Gradle, Android Gradle Plugin, Kotlin, and the iOS deployment target to the versions your target React Native release requires. Do this with the New Architecture still disabled, and ship a release from this state. You now have a known-good starting point whose only difference from your previous release is dependency versions — a failure here is unambiguously a toolchain problem rather than an architecture problem.

```bash
npx react-native upgrade
bundle install && cd ios && bundle exec pod install
cd android && ./gradlew clean && ./gradlew assembleRelease
```

### Step 3: Enable the New Architecture

Enablement is a build flag on each platform plus a JavaScript flag for the bridge-less runtime. Set them, rebuild from clean, and expect the app to still work through the interop layer — that is the point of this step: prove the build and the app survive enablement before changing a single native module.

```text
# android/gradle.properties
newArchEnabled=true
hermesEnabled=true
```

```ruby
# ios/Podfile — set before the target definitions
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

On iOS the flag changes what codegen runs during `pod install`, so a clean `Pods` directory is mandatory; stale Pods produce link errors that look like missing symbols for codegen output that was never generated.

```bash
cd ios && rm -rf Pods Podfile.lock && bundle exec pod install
```

### Step 4: Verify Codegen Output and Pin It as Read-Only

Confirm codegen actually produced artifacts for your specs before writing any native code. The generated files live under `build/generated` on Android and `ios/build/generated` on iOS, and their absence is the usual explanation for "the spec compiles but the module is undefined at runtime."

```bash
find android/app/build/generated ios/build/generated -name "*Spec*" -type f | head -20
```

Add both directories to `.gitignore` and reject pull requests that commit them. Generated interfaces must always be reproducible from the spec, otherwise two developers can build against different generated headers and produce link errors that do not reproduce on each other's machines.

### Step 5: Migrate Native Modules to TurboModules

Start with the smallest internal module — ideally one with two or three methods and no third-party consumers. Write the TypeScript spec first. The spec is the contract, and codegen derives the native interface from it.

```typescript
// specs/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getInstallId(): Promise<string>;
  isLowPowerModeEnabled(): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DeviceInfo');
```

The `getEnforcing` call throws at startup if the module is not registered, which is exactly the failure you want during migration — silent `undefined` modules are far more expensive to diagnose than a startup crash in a development build. On Android, implement the generated abstract class and register it in a `TurboReactPackage`; on iOS, conform to the generated protocol and export it through the module provider.

```java
// android/.../DeviceInfoModule.java
public class DeviceInfoModule extends NativeDeviceInfoSpec {
  public static final String NAME = NativeDeviceInfoSpec.NAME;

  @Override
  public void getInstallId(Promise promise) {
    promise.resolve(InstallIdStore.read(getReactApplicationContext()));
  }

  @Override
  public boolean isLowPowerModeEnabled() {
    PowerManager pm = (PowerManager) getReactApplicationContext()
        .getSystemService(Context.POWER_SERVICE);
    return !pm.isInteractive();
  }
}
```

```objectivec
// ios/DeviceInfo.mm
@implementation DeviceInfo
RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeDeviceInfoSpecJSI>(params);
}

- (void)getInstallId:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  resolve([InstallIdStore readInstallId]);
}
@end
```

### Step 6: Migrate View Components to Fabric

Fabric view components follow the same spec-first discipline, but the spec describes props and events rather than methods. Convert one screen's native view at a time, keeping the JavaScript-facing component name identical so call sites do not change.

```typescript
// specs/ChartViewNativeComponent.ts
import type { ViewProps } from 'react-native';
import type { HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  dataPoints: ReadonlyArray<Readonly<{ x: number; y: number }>>;
  animated?: boolean;
}

export default codegenNativeComponent<NativeProps>(
  'ChartView'
) as HostComponent<NativeProps>;
```

The most common Fabric conversion bug is prop-type drift: legacy view managers accepted loosely typed props through `RCT_EXPORT_VIEW_PROPERTY` macros, while Fabric validates the generated struct. When a prop silently stops being applied, the generated spec almost always disagrees with the native setter signature — fix the spec rather than patching the native side.

### Step 7: Handle Remaining Dependencies with the Interop Layer

Anything still on the legacy path after your own modules are converted should be wrapped by the interop layer rather than rewritten. Keep a running count of interop-wrapped dependencies and review it each sprint; the list only shrinks if someone owns it. When a dependency publishes a New Architecture release, upgrade immediately and remove the interop entry in the same pull request, so the burn-down cannot regress.

```text
Interop burn-down (sprint 14)
─────────────────────────────
Week 1: 9 interop modules
Week 2: 7   (removed legacy-analytics-sdk, upgraded react-native-camera)
Week 3: 5   (converted internal auth + push modules)
Week 4: 2   (upgraded remaining SVG/gesture libraries)
```

### Step 8: Resolve Threading and Lifecycle Regressions

After conversion, run the app against the flows most sensitive to threading: rapid navigation during animation, background fetch resuming after the app was killed, and camera or BLE callbacks arriving during a navigation transition. Fixes usually take one of three shapes — move shared state behind a lock or an actor, move initialization out of module constructors into explicit `initialize()` calls, and replace "assume the view exists" callbacks with null-checked ones. Log the runtime instance identifier in native code during this phase; in bridgeless mode more than one runtime can exist, and cross-instance callbacks are otherwise almost impossible to attribute.

### Step 9: Test Both Architectures in CI

Run the full test suite twice — once with `newArchEnabled=true` and once with it disabled — until the migration is complete. Detox or Maestro end-to-end suites catch mount and layout regressions that unit tests cannot see, and they catch them at the pull-request stage rather than during a staged rollout. Cache the two configurations separately, because sharing a build cache between architectures produces link failures that waste hours.

```yaml
jobs:
  e2e:
    strategy:
      matrix:
        newArch: ['true', 'false']
    env:
      RCT_NEW_ARCH_ENABLED: ${{ matrix.newArch == 'true' && '1' || '0' }}
```

### Step 10: Roll Out Behind a Flag and Retire the Interop Layer

Ship with the New Architecture enabled for an internal cohort, then a small percentage of production users, comparing startup time, frame rate, memory, and crash-free sessions against the legacy cohort. Once the metrics hold and the interop list reaches zero — or contains only dependencies you have consciously accepted — remove the legacy build path, delete the dual-architecture CI matrix, and drop the flag. Keeping the escape hatch indefinitely is how teams end up maintaining two rendering pipelines for a year.

## Conclusion

Migrating to the New Architecture is a toolchain upgrade, a spec-writing discipline, and a dependency burn-down executed together, in that order. Teams that land each of those as separate, shippable increments finish the migration in weeks with a measurable rollback at every step; teams that combine them into one heroic branch spend the same weeks debugging. The durable win is not the performance delta on the first release — it is that native interfaces become typed and generated, so the next React Native upgrade costs a build instead of a migration.
