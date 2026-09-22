-keepnames class com.example.api.ProductVariantDto
-if class com.example.api.ProductVariantDto
-keep class com.example.api.ProductVariantDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
