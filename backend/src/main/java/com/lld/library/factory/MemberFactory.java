package com.lld.library.factory;

import com.lld.library.enums.MemberType;
import com.lld.library.model.LoanPolicy;
import com.lld.library.model.Member;

public class MemberFactory {

    public static LoanPolicy getPolicyForType(MemberType type) {
        if (type == null) {
            type = MemberType.GENERAL;
        }
        switch (type) {
            case STUDENT:
                return new LoanPolicy(3, 14);
            case FACULTY:
                return new LoanPolicy(10, 30);
            case GENERAL:
            default:
                return new LoanPolicy(5, 21);
        }
    }

    public static Member createMember(String id, String name, String email, MemberType type) {
        LoanPolicy policy = getPolicyForType(type);
        return new Member(id, name, email, type, policy);
    }
}
