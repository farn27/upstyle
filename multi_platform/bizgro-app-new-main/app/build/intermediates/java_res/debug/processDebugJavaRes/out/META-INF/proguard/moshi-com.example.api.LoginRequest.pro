-keepnames class com.example.api.LoginRequest
-if class com.example.api.LoginRequest
-keep class com.example.api.LoginRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
