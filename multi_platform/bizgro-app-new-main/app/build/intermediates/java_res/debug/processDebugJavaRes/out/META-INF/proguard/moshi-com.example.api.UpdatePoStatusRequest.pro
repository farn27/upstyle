-keepnames class com.example.api.UpdatePoStatusRequest
-if class com.example.api.UpdatePoStatusRequest
-keep class com.example.api.UpdatePoStatusRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
