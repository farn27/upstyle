-keepnames class com.example.api.LoginResponse
-if class com.example.api.LoginResponse
-keep class com.example.api.LoginResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
