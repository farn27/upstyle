-keepnames class com.example.api.GetCrmResponse
-if class com.example.api.GetCrmResponse
-keep class com.example.api.GetCrmResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
