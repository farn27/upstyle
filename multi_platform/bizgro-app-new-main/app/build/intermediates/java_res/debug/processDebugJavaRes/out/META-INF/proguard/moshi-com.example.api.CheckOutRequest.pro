-keepnames class com.example.api.CheckoutRequest
-if class com.example.api.CheckoutRequest
-keep class com.example.api.CheckoutRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.CheckoutRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.CheckoutRequest {
    public synthetic <init>(java.lang.String,com.example.api.PosOrderDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
