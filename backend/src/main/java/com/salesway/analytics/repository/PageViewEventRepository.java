package com.salesway.analytics.repository;

import com.salesway.analytics.entity.PageViewEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PageViewEventRepository extends JpaRepository<PageViewEvent, UUID> {
    @Query("""
            select count(e) from PageViewEvent e
            where e.createdAt >= :since
            """)
    long countAllSince(@Param("since") Instant since);

    @Query("""
            select count(distinct e.company.id) from PageViewEvent e
            where e.createdAt >= :since
            """)
    long countDistinctCompaniesSince(@Param("since") Instant since);

    @Query("""
            select count(distinct e.user.id) from PageViewEvent e
            where e.createdAt >= :since
            """)
    long countDistinctUsersSince(@Param("since") Instant since);

    @Query("""
            select e.company.id,
                   e.company.name,
                   count(e),
                   count(distinct e.user.id),
                   max(e.createdAt)
            from PageViewEvent e
            where e.createdAt >= :since
            group by e.company.id, e.company.name
            order by count(e) desc, max(e.createdAt) desc
            """)
    List<Object[]> findCompanyActivitySince(@Param("since") Instant since);

    @Query("""
            select e.path,
                   max(e.routeName),
                   count(e),
                   count(distinct e.company.id),
                   count(distinct e.user.id)
            from PageViewEvent e
            where e.createdAt >= :since
            group by e.path
            order by count(e) desc, e.path asc
            """)
    List<Object[]> findTopPagesSince(@Param("since") Instant since);
}
