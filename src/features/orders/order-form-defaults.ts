interface ProductPriceReference {
    costPrice?: number | null;
    id: string;
    sellingPrice?: number | null;
}

interface CustomerAddressReference {
    address?: string | null;
    id: string;
}

export const getDefaultPurchaseUnitPrice = (
    products: ProductPriceReference[],
    productId: string
): string => {
    const product = products.find((entry) => entry.id === productId);
    if (!product || product.costPrice == null) {
        return "";
    }

    return String(product.costPrice);
};

export const getDefaultSalesUnitPrice = (
    products: ProductPriceReference[],
    productId: string
): string => {
    const product = products.find((entry) => entry.id === productId);
    if (!product || product.sellingPrice == null) {
        return "";
    }

    return String(product.sellingPrice);
};

export const getCustomerDefaultShippingAddress = (
    customers: CustomerAddressReference[],
    customerId: string
): string => {
    const customer = customers.find((entry) => entry.id === customerId);
    return customer?.address?.trim() ?? "";
};
