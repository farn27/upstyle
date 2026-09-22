-keepnames class com.example.api.TransactionDto
-if class com.example.api.TransactionDto
-keep class com.example.api.TransactionDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
