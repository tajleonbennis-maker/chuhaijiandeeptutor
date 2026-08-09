plugins {
    id("com.android.application")
}

android {
    namespace = "com.chuhaijian.deeptutor"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.chuhaijian.deeptutor"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        // The Android client intentionally has no server selector. Releasing a
        // build for another deployment requires a new, reviewed APK.
        buildConfigField("String", "SERVER_URL", "\"http://102.134.48.49:3782/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.activity:activity:1.12.4")
}
