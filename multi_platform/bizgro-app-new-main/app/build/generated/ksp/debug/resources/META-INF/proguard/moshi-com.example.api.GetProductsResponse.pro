-keepnames class com.example.api.GetProductsResponse
-if class com.example.api.GetProductsResponse
-keep class com.example.api.GetProductsResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
