-keepnames class com.example.api.ProductDto
-if class com.example.api.ProductDto
-keep class com.example.api.ProductDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.ProductDto
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.ProductDto {
    public synthetic <init>(java.lang.String,java.lang.String,java.lang.String,double,double,int,java.lang.String,int,java.util.List,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
